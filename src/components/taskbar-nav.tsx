
'use client';

import React from 'react';
import { Home, Ship } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from './ui/separator';

const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/build', label: 'Create Crew', icon: Ship },
];

export default function TaskbarNav() {
    const pathname = usePathname();

    return (
        <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
            <TooltipProvider>
                <div className="flex items-center gap-2 h-14 p-2 bg-[url(/map_bg.jpg)] bg-cover bg-center border-2 border-yellow-800/60 rounded-xl shadow-2xl">
                     {navItems.map((item, index) => (
                        <React.Fragment key={item.href}>
                            {index > 0 && <Separator orientation="vertical" className="h-6 bg-yellow-800/40" />}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "w-12 h-12 rounded-lg transition-all hover:bg-black/20",
                                            pathname === item.href ? 'bg-black/30' : ''
                                        )}
                                        asChild
                                    >
                                        <Link href={item.href}>
                                            <item.icon className="w-6 h-6 text-white drop-shadow-md" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="bg-card/90 text-card-foreground border-yellow-800/60">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        </React.Fragment>
                     ))}
                </div>
            </TooltipProvider>
        </footer>
    );
}
