
import React from 'react';
import { Cloud, Sun, CloudRain, Wind } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const WeatherLoader = () => {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center space-y-6">
            <div className="relative w-24 h-24">
                {/* Animated Sun */}
                <div className="absolute top-0 right-0 animate-bounce duration-[3000ms]">
                    <Sun className="w-10 h-10 text-amber-400 animate-spin-slow" />
                </div>

                {/* Animated Cloud */}
                <div className="absolute bottom-2 left-0 animate-pulse transition-all duration-1000">
                    <Cloud className="w-16 h-16 text-primary fill-primary/20" />
                </div>

                {/* Rain Drops or Wind */}
                <div className="absolute bottom-0 left-8 flex space-x-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-1 h-3 bg-primary rounded-full animate-bounce`}
                            style={{ animationDelay: `${i * 200}ms` }}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold tracking-tight text-foreground animate-pulse">
                    {t('syncing')}
                </h3>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                    <Wind className="w-4 h-4 animate-bounce" />
                    {t('analyzing_data')}
                </p>
            </div>
        </div>
    );
};

export default WeatherLoader;
