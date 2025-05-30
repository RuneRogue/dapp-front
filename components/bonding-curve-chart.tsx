'use client';

import { forwardRef, useImperativeHandle, useEffect } from 'react';
import { Agent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Lock, Unlock, Rocket, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBondingCurve } from '@/lib/bonding-curve-context';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BondingCurveChartProps {
  agent: Agent;
  className?: string;
}

export const BondingCurveChart = forwardRef<
  { refetch?: () => void },
  BondingCurveChartProps
>(({ agent, className }, ref) => {
  const { data: bondingData, refresh } = useBondingCurve();
  const isLeftCurve = agent.type === 'leftcurve';

  // Debug logging for incoming data
  useEffect(() => {}, [agent.id, agent.type, bondingData]);

  useImperativeHandle(
    ref,
    () => ({
      refetch: refresh,
    }),
    [refresh],
  );

  // Use bonding curve data directly
  const { currentPrice, holders, progress, bondingStatus, isLoading, error } =
    bondingData;

  if (isLoading) {
    return (
      <Card className={cn('p-4 border-2', className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-8 bg-muted rounded" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    console.error('❌ BondingCurveChart Error:', error);
    return (
      <Card className={cn('p-4 border-2', className)}>
        <Alert variant="destructive">
          <AlertDescription>
            {error}
            <button onClick={refresh} className="ml-2 underline">
              Retry
            </button>
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  const isInBonding = bondingStatus === 'BONDING';
  const remainingLiquidity = 10000 - holders * Number(currentPrice) * 1000;
  const progressColor = isLeftCurve
    ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500 animate-gradient'
    : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 animate-gradient';

  return (
    <Card
      className={cn(
        'p-4 border-2 transition-all duration-300',
        isLeftCurve
          ? 'hover:border-yellow-500/50 bg-yellow-950/20'
          : 'hover:border-purple-500/50 bg-purple-950/20',
        className,
      )}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles
              className={cn(
                'h-4 w-4 animate-pulse',
                isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
              )}
            />
            <h3 className="text-sm font-medium">Bonding Progress</h3>
          </div>
          <div
            className={cn(
              'text-sm font-bold flex items-center gap-1.5',
              isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
            )}
          >
            {progress >= 98 && <Rocket className="h-3 w-3 animate-bounce" />}
            {(progress / 100).toFixed(1)}%
          </div>
        </div>

        <div className="relative">
          <Progress
            value={progress / 100}
            className="h-4 bg-background/50 border-2 border-border"
            indicatorClassName={cn(
              'transition-all duration-500 shadow-lg shadow-yellow-500/20',
              progressColor,
            )}
          />
          {progress >= 90 && (
            <div className="absolute inset-0 animate-pulse duration-1000">
              <div
                className={cn(
                  'h-full w-full rounded-full opacity-50',
                  progressColor,
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Current Price</p>
            <p
              className={cn(
                'font-bold font-mono text-xs',
                isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
              )}
            >
              Ξ{(Number(currentPrice) / 1e18).toFixed(14)}
            </p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-muted-foreground">Target Price</p>
            <p
              className={cn(
                'font-bold font-mono text-xs',
                isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
              )}
            >
              Ξ{((Number(currentPrice) / 1e18) * 1.1).toFixed(14)}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-1.5">
                {!isInBonding ? (
                  <Unlock className="h-3 w-3 text-green-500" />
                ) : (
                  <Lock className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="text-muted-foreground">Liquidity Status</span>
              </div>
              <span
                className={cn(
                  'font-mono font-bold',
                  isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
                )}
              >
                {(holders * Number(currentPrice) * 1000).toLocaleString()} /
                10,000 LEFT
              </span>
            </div>
            <div
              className={cn(
                'text-xs px-2 py-1.5 rounded-md border-2 flex items-center justify-center gap-1.5 font-medium',
                !isInBonding
                  ? 'bg-green-500/20 border-green-500/30 text-green-500'
                  : isLeftCurve
                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-500',
              )}
            >
              {!isInBonding ? (
                <>🚀 Trading Now Live!</>
              ) : remainingLiquidity <= 1000 ? (
                <>
                  ✨ Only {remainingLiquidity.toLocaleString()} LEFT until
                  launch!
                </>
              ) : (
                <>
                  {remainingLiquidity.toLocaleString()} LEFT needed to unlock
                  trading
                </>
              )}
            </div>
          </div>
        </div>

        {progress >= 9000 && progress < 10000 && (
          <div
            className={cn(
              'text-xs font-bold animate-pulse text-center mt-1 flex items-center justify-center gap-1.5',
              isLeftCurve ? 'text-yellow-500' : 'text-purple-500',
            )}
          >
            <Rocket className="h-3 w-3" />
            {progress >= 9800
              ? 'Launch sequence initiated! 🚀'
              : 'Launch approaching! 🔥'}
          </div>
        )}
      </div>
    </Card>
  );
});
BondingCurveChart.displayName = 'BondingCurveChart';
