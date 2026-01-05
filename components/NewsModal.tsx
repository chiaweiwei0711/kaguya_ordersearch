
import React, { useState, useEffect } from 'react';
import { X, Calendar, Heart } from 'lucide-react';
import { Announcement } from '../types';
import { incrementAnnouncementLike } from '../services/googleSheetService';

interface NewsModalProps {
  news: Announcement | null;
  isOpen: boolean;
  onClose: () => void;
}

const NewsModal: React.FC<NewsModalProps> = ({ news, isOpen, onClose }) => {
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  useEffect(() => {
    if (news) {
      setLikes(news.likes || 0);
      setHasLiked(false);
    }
  }, [news]);

  if (!isOpen || !news) return null;

  const handleLike = async () => {
    if (hasLiked) return;

    setHasLiked(true);
    setLikes(prev => prev + 1);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);

    // 背景更新資料庫
    incrementAnnouncementLike(news.id);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[70] p-4 animate-fade-in">
      <div className="bg-[#050505] border-2 border-pink-500/50 rounded-3xl w-full max-w-lg overflow-hidden relative shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col max-h-[90vh]">
        
        {/* 右上角關閉按鈕 */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 p-2 bg-gray-900/80 hover:bg-pink-500 rounded-full text-white hover:text-black border border-gray-800 transition-all z-20 group"
        >
          <X size={20} className="group-hover:scale-110" />
        </button>

        <div className="p-8 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
          {/* 置中顯眼標題 */}
          <h1 className="text-[#ff007f] text-center text-3xl font-black mb-8 tracking-tighter drop-shadow-[0_0_15px_rgba(255,0,127,0.4)]">
            最新公告
          </h1>

          <div className="flex items-center gap-2 text-gray-500 text-[10px] font-black uppercase tracking-widest mb-3 px-2">
            <Calendar size={12} className="text-pink-500/50" />
            {news.date}
          </div>
          
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6 leading-tight px-2">
            {news.title}
          </h2>
          
          <div className="bg-gray-900/30 border border-gray-800/50 rounded-2xl p-6 md:p-8 shadow-inner mb-8">
            <p className="text-gray-300 font-bold leading-loose whitespace-pre-wrap text-base">
              {news.content}
            </p>
          </div>

          {/* 按讚計數器 */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            <button 
              onClick={handleLike}
              disabled={hasLiked}
              className={`
                group flex items-center gap-3 px-8 py-3 rounded-full border-2 transition-all duration-300
                ${hasLiked 
                  ? 'bg-pink-500 border-pink-500 text-black cursor-default' 
                  : 'bg-black border-pink-500 text-pink-500 hover:bg-pink-500/10 active:scale-95'}
                ${isBouncing ? 'animate-bounce' : ''}
                shadow-[0_0_20px_rgba(236,72,153,0.2)]
              `}
            >
              <Heart 
                size={22} 
                className={`${hasLiked ? 'fill-black' : 'group-hover:fill-pink-500'} transition-colors`} 
              />
              <span className="font-black text-xl tracking-tighter">{likes}</span>
            </button>
            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-3">
              {hasLiked ? '感謝您的喜愛！' : '覺得這則公告有幫助嗎？'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
