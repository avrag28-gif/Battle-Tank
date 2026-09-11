/**
 * TikTok Live 3D Tank Battle - Live Stream Event Feed
 */

import React, { useEffect, useRef } from 'react';
import { LogFeedItem } from '../types/game';
import { Gift, Zap, MessageSquare, ShieldAlert } from 'lucide-react';

interface EventFeedProps {
  feed: LogFeedItem[];
}

export const EventFeed: React.FC<EventFeedProps> = ({ feed }) => {
  const feedContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedContainerRef.current) {
      feedContainerRef.current.scrollTop = feedContainerRef.current.scrollHeight;
    }
  }, [feed]);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md rounded-xl p-2.5 border border-slate-800 shadow-xl w-full max-h-36 flex flex-col">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 border-b border-slate-800/80 pb-1 mb-1.5">
        <Zap className="w-3.5 h-3.5 text-cyan-400" />
        <span className="uppercase tracking-wider">LIVE STREAM EVENTS</span>
      </div>

      <div ref={feedContainerRef} className="overflow-y-auto space-y-1 pr-1 flex-1 text-xs font-semibold">
        {feed.length === 0 ? (
          <div className="text-slate-600 text-[11px] italic text-center py-2">
            No stream events yet...
          </div>
        ) : (
          feed.map((item) => {
            const isGift = item.type === 'PLAYER_JOIN' || item.type === 'PLAYER_HEAL' || item.type === 'PLAYER_SPECIAL';
            const isSystem = item.type === 'SYSTEM';

            return (
              <div
                key={item.id}
                className={`flex items-start gap-1.5 py-1 px-2 rounded ${
                  isGift
                    ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                    : isSystem
                    ? 'bg-slate-800/60 text-slate-300'
                    : 'bg-slate-950/40 text-slate-200'
                }`}
              >
                {isGift ? (
                  <Gift className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                ) : isSystem ? (
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                )}

                <span className="leading-tight break-words text-[11px] font-medium">
                  {item.message}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
