
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, FileText, ExternalLink, Eye, Sparkles } from "lucide-react";

interface RestaurantCardProps {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  imageHint?: string;
  menuPdfUrl?: string;
  menuUrl?: string;
  generatedMenuJson?: string;
  onViewMenuFallback: () => void;
}

export function RestaurantCard({
  id,
  name,
  location,
  imageUrl,
  imageHint,
  menuPdfUrl,
  menuUrl,
  generatedMenuJson,
  onViewMenuFallback
}: RestaurantCardProps) {
  
  const hasSimpleMenu = menuPdfUrl || menuUrl;
  const hasAiMenu = !!generatedMenuJson;

  const handleViewMenuClick = () => {
    if (menuUrl) {
      window.open(menuUrl, '_blank', 'noopener,noreferrer');
    } else if (menuPdfUrl) {
      window.open(menuPdfUrl, '_blank', 'noopener,noreferrer');
    }
     else {
      onViewMenuFallback();
    }
  };

  const getMenuIcon = () => {
    if (menuUrl) return <ExternalLink className="mr-2 h-5 w-5" />;
    if (menuPdfUrl) return <FileText className="mr-2 h-5 w-5" />;
    return <Eye className="mr-2 h-5 w-5" />;
  }

  return (
    <Card className="group/card flex flex-col h-full overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 bg-card border-border/70">
      <CardHeader className="p-0 relative">
        <div className="aspect-[16/10] w-full overflow-hidden">
          <Image
            src={imageUrl}
            alt={`Εικόνα του ${name}`}
            width={600}
            height={375}
            className="object-cover w-full h-full group-hover/card:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={imageHint}
            priority={id === "1" || id === "2" || id === "3"}
          />
        </div>
      </CardHeader>
      <CardContent className="p-5 flex-grow">
        <CardTitle className="text-xl font-headline font-semibold mb-1.5 text-primary group-hover/card:text-accent transition-colors">
          {name}
        </CardTitle>
        <div className="flex items-center text-muted-foreground text-sm font-body">
          <MapPin className="w-4 h-4 mr-1.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{location}</span>
        </div>
      </CardContent>
      <CardFooter className="p-5 pt-0 mt-auto flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleViewMenuClick}
          className="flex-1 bg-primary hover:bg-accent hover:text-accent-foreground text-primary-foreground font-body font-medium py-2.5 rounded-lg transition-all duration-300 ease-in-out shadow-md hover:shadow-lg"
          aria-label={`Δες το μενού για ${name}`}
          disabled={!hasSimpleMenu}
          variant="default"
          size="lg"
        >
          {getMenuIcon()}
          {hasSimpleMenu ? 'Δες το μενού' : 'Μενού μη διαθέσιμο'}
        </Button>
        {hasAiMenu && (
           <Link href={`/menu/${id}`} passHref>
            <Button
                variant="outline"
                size="lg"
                className="flex-1 w-full bg-accent/20 border-accent/50 text-accent-foreground hover:bg-accent"
                aria-label={`Δες το AI μενού για ${name}`}
            >
                <Sparkles className="mr-2 h-5 w-5" />
                AI Μενού
            </Button>
           </Link>
        )}
      </CardFooter>
    </Card>
  );
}
