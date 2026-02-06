import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Check } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

interface CubeSkin {
  id: string;
  name: string;
  price: number | 'equipped' | 'reward';
  category: 'classic' | 'metallic' | 'shapes';
  rarity?: 'rare';
  rewardText?: string;
}

const cubeSkins: CubeSkin[] = [
  { id: 'classic-matte', name: 'Classic Matte', price: 'equipped', category: 'classic' },
  { id: 'gold-metallic', name: 'Gold Metallic', price: 1200, category: 'metallic' },
  { id: 'neon-pulse', name: 'Neon Pulse', price: 500, category: 'classic' },
  { id: 'pyramid', name: 'Pyramid Skin', price: 1500, category: 'shapes', rarity: 'rare' },
  { id: 'dark-oak', name: 'Dark Oak', price: 850, category: 'classic' },
  { id: 'carbon-fiber', name: 'Carbon Fiber', price: 'reward', category: 'metallic', rewardText: 'Daily Challenge Reward' },
];

const categories = ['All', 'Classic', 'Metallic', 'Shapes'];

const Collection = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [coins] = useState(1250);
  const [equippedSkin] = useState('classic-matte');

  const filteredSkins = selectedCategory === 'All' 
    ? cubeSkins 
    : cubeSkins.filter(skin => skin.category === selectedCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="btn-icon"
          aria-label="Back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        
        <h1 className="text-xl font-bold tracking-wider">Cube Collection</h1>
        
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary">
          <Coins className="w-4 h-4 text-gold" />
          <span className="font-bold text-sm">{coins.toLocaleString()}</span>
        </div>
      </header>

      <main className="px-4">
        {/* Currently Equipped */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-6"
        >
          <span className="inline-block px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider mb-4">
            Currently Equipped
          </span>
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-2xl bg-secondary flex items-center justify-center">
              <div className="grid grid-cols-3 gap-1 w-20 h-20">
                {Array(9).fill(null).map((_, i) => (
                  <div key={i} className={`rounded-sm ${
                    i % 3 === 0 ? 'bg-cube-red' : 
                    i % 3 === 1 ? 'bg-cube-orange' : 'bg-cube-blue'
                  }`} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-4 gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
        </motion.div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-muted'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Skins Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredSkins.map((skin, index) => {
            const isEquipped = skin.id === equippedSkin;
            
            return (
              <motion.div
                key={skin.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`glass-card relative ${isEquipped ? 'border-primary border-2' : ''}`}
              >
                {/* Rarity badge */}
                {skin.rarity && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-destructive text-destructive-foreground">
                    {skin.rarity}
                  </span>
                )}
                
                {/* Equipped checkmark */}
                {isEquipped && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </div>
                )}

                {/* Skin preview */}
                <div className="aspect-square rounded-xl bg-secondary mb-3 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-0.5 w-16 h-16">
                    {Array(9).fill(null).map((_, i) => (
                      <div key={i} className={`rounded-sm ${
                        skin.category === 'metallic' ? 'bg-gold/80' :
                        skin.category === 'shapes' ? 'bg-amber-600' :
                        i % 2 === 0 ? 'bg-muted' : 'bg-muted-foreground/50'
                      }`} />
                    ))}
                  </div>
                </div>

                {/* Skin info */}
                <h3 className="font-bold text-sm mb-1">{skin.name}</h3>
                
                {skin.price === 'equipped' ? (
                  <span className="text-xs text-primary font-semibold uppercase">Equipped</span>
                ) : skin.price === 'reward' ? (
                  <>
                    <span className="text-xs text-muted-foreground">{skin.rewardText}</span>
                    <button className="w-full mt-2 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
                      SELECT
                    </button>
                  </>
                ) : (
                  <button className="w-full mt-2 py-2 rounded-lg bg-secondary text-foreground text-sm font-bold flex items-center justify-center gap-2">
                    <Coins className="w-4 h-4 text-gold" />
                    {skin.price.toLocaleString()}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Collection;
