'use server';

import { Agent, ApiAgent } from '@/lib/types';
import { RpcProvider, Abi } from 'starknet';
import { isInBondingPhase } from '@/lib/utils';

// Initialize provider
const provider = new RpcProvider({
  nodeUrl:
    process.env.NODE_URL || 'https://starknet-sepolia.public.blastapi.io',
});

async function mapApiAgentToAgent(apiAgent: ApiAgent): Promise<Agent> {
  const tokenAddress = apiAgent.Token?.contractAddress
    ? apiAgent.Token.contractAddress.startsWith('0x')
      ? apiAgent.Token.contractAddress
      : `0x${apiAgent.Token.contractAddress}`
    : undefined;

  const price = apiAgent.LatestMarketData?.price || 0;
  const holders = apiAgent.LatestMarketData?.holders || 0;
  const isBonding =
    apiAgent.status !== 'RUNNING' || isInBondingPhase(price, holders);

  // Construct profile picture URL if available
  const profilePictureUrl = apiAgent.profilePicture
    ? `/uploads/profile-pictures/${apiAgent.profilePicture}`
    : undefined;

  // Create base agent with explicit type
  const baseAgent: Omit<Agent, 'abi'> & { abi: Abi } = {
    id: apiAgent.id,
    name: apiAgent.name,
    symbol: apiAgent.name.substring(0, 4).toUpperCase(),
    type: apiAgent.curveSide === 'LEFT' ? 'leftcurve' : 'rightcurve',
    status: isBonding ? 'bonding' : 'live',
    price,
    marketCap: apiAgent.LatestMarketData?.marketCap || 0,
    holders,
    creator: apiAgent.Wallet?.deployedAddress
      ? `0x${apiAgent.Wallet.deployedAddress}`
      : 'unknown',
    createdAt: apiAgent.createdAt,
    creativityIndex: apiAgent.degenScore || 0,
    performanceIndex: apiAgent.winScore || 0,
    profilePicture: apiAgent.profilePicture || undefined,
    profilePictureUrl,
    contractAddress: (tokenAddress || '0x0') as `0x${string}`,
    abi: [],
    pnlCycle: apiAgent.LatestMarketData?.pnlCycle || 0,
    pnl24h: apiAgent.LatestMarketData?.pnl24h || 0,
    tradeCount: apiAgent.LatestMarketData?.tradeCount || 0,
    tvl: apiAgent.LatestMarketData?.balanceInUSD || 0,
    cycleRanking: apiAgent.LatestMarketData?.pnlRank || 0,
    forkerCount: apiAgent.LatestMarketData?.forkCount || 0,
    priceChange24h: apiAgent.LatestMarketData?.priceChange24h || 0
  };

  if (!tokenAddress) {
    return baseAgent as Agent;
  }

  try {
    const { abi } = await provider.getClassAt(tokenAddress);
    if (!abi) {
      throw new Error('No ABI found for token contract');
    }

    return {
      ...baseAgent,
      abi,
    } as Agent;
  } catch (error) {
    console.error('Error fetching ABI for agent:', apiAgent.id, error);
    return baseAgent as Agent;
  }
}

export async function getLatestAgents() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL;
    const apiKey = process.env.API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error('Missing API configuration');
    }

    // First check if server is available
    try {
      const healthCheck = await fetch(`${apiUrl}/api/docs`);
      if (!healthCheck.ok) {
        console.error('❌ Backend server not responding:', {
          status: healthCheck.status,
          statusText: healthCheck.statusText,
        });
        throw new Error(
          'Backend server not available - please ensure it is running',
        );
      }
    } catch (error) {
      console.error('❌ Backend server health check failed:', error);
      throw new Error(
        'Backend server not reachable - please check if it is running on port 8080',
      );
    }

    const url = `${apiUrl}/api/eliza-agent/latest`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey as string,
      },
    });

    let responseData = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key - please check your .env file');
      } else if (response.status === 404) {
        // Try the main endpoint as fallback
        console.log(
          '⚠️ Latest endpoint not available, trying main endpoint...',
        );
        const mainResponse = await fetch(`${apiUrl}/api/eliza-agent`, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
          },
        });

        if (!mainResponse.ok) {
          throw new Error(
            'Both latest and main endpoints failed - please check server status',
          );
        }

        responseData = await mainResponse.json();
      } else if (response.status >= 500) {
        throw new Error('Server error - please try again later');
      } else {
        throw new Error(
          responseData.message || 'Failed to fetch latest agents',
        );
      }
    }

    // Check if we have the expected data structure
    if (!responseData.data?.agents) {
      console.error('Unexpected API response structure:', responseData);
      throw new Error('Invalid API response structure');
    }

    // Map agents and wait for all promises to resolve
    const mappedAgents = await Promise.all(
      responseData.data.agents.map(mapApiAgentToAgent),
    );

    return {
      success: true,
      data: mappedAgents,
    };
  } catch (error) {
    console.error('❌ Error fetching latest agents:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}
