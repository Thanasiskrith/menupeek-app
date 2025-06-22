
"use client";

import * as React from "react";
import Link from 'next/link';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RestaurantCard } from "@/components/domain/restaurant-card";
import { Search, ShieldCheck, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Restaurant {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  imageHint: string;
  menuPdfUrl?: string;
  menuUrl?: string;
  generatedMenuJson?: string;
}

interface HomePageClientProps {
    initialRestaurants: Restaurant[];
}

export function HomePageClient({ initialRestaurants }: HomePageClientProps) {
  const { toast } = useToast();
  // State is initialized with the data passed from the server component
  const [restaurants, setRestaurants] = React.useState<Restaurant[]>(initialRestaurants);
  const [isLoading, setIsLoading] = React.useState(false); // No longer loading on initial mount
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleViewMenuFallback = (restaurantName: string) => {
    toast({
      title: "Πληροφορία Μενού",
      description: `Δεν υπάρχει διαθέσιμο μενού (PDF/URL) για το κατάστημα: ${restaurantName}.`,
    });
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const filteredRestaurants = restaurants.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      restaurant.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-headline font-bold text-primary mb-3 sm:mb-4">
            MenuPeek
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl font-body text-foreground/80 max-w-3xl mx-auto">
            Βρες το μενού από καφέ & εστιατόρια της περιοχής σου, εύκολα και γρήγορα!
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/admin" passHref>
              <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/10 shadow-md hover:shadow-lg font-medium">
                <ShieldCheck className="mr-2 h-5 w-5" />
                Πίνακας Διαχείρισης
              </Button>
            </Link>
          </div>
        </header>

        <section className="w-full max-w-xl mx-auto mb-12 sm:mb-16 px-4">
          <div className="relative flex items-center">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground z-10 pointer-events-none"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Αναζήτηση περιοχής ή μαγαζιού..."
              className="w-full pl-12 pr-4 py-3 text-base sm:text-lg font-body rounded-full shadow-lg bg-input border-2 border-border hover:border-primary/30 focus:ring-2 focus:ring-accent focus:border-accent transition-all duration-300 ease-in-out"
              aria-label="Αναζήτηση περιοχής ή μαγαζιού"
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>
        </section>

        <main>
          {isLoading ? (
            <div className="flex justify-center items-center col-span-full py-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    id={restaurant.id}
                    name={restaurant.name}
                    location={restaurant.location}
                    imageUrl={restaurant.imageUrl}
                    imageHint={restaurant.imageHint}
                    menuPdfUrl={restaurant.menuPdfUrl}
                    menuUrl={restaurant.menuUrl}
                    generatedMenuJson={restaurant.generatedMenuJson}
                    onViewMenuFallback={() => handleViewMenuFallback(restaurant.name)}
                  />
                ))
              ) : (
                <p className="col-span-full text-center text-muted-foreground text-lg">
                  {searchTerm
                    ? `Δεν βρέθηκαν αποτελέσματα για "${searchTerm}".`
                    : "Δεν βρέθηκαν εστιατόρια στη βάση δεδομένων. Επισκεφθείτε τον Πίνακα Διαχείρισης για να προσθέσετε."
                  }
                </p>
              )}
            </div>
          )}
        </main>
      </div>

      <footer className="w-full py-8 mt-12 sm:mt-16 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground font-body">
          <p>&copy; {new Date().getFullYear()} MenuPeek. Με την υποστήριξη της τεχνολογίας.</p>
        </div>
      </footer>
    </div>
  );
}
