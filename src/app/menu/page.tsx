
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Frown } from "lucide-react";
import type { DigitalMenu, MenuCategory, MenuItem } from "@/ai/flows/generate-digital-menu-flow";

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

export default function PublicMenuPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId as string;

  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [menuData, setMenuData] = useState<DigitalMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (restaurantId) {
      const fetchMenu = async () => {
        setIsLoading(true);

        if (!db) {
            setError("Η σύνδεση με τη βάση δεδομένων απέτυχε. Η υπηρεσία ενδέχεται να μην έχει ρυθμιστεί σωστά.");
            setIsLoading(false);
            return;
        }

        try {
          const restaurantDocRef = doc(db, "restaurants", restaurantId);
          const restaurantDoc = await getDoc(restaurantDocRef);

          if (restaurantDoc.exists()) {
            const foundRestaurant = restaurantDoc.data() as Omit<Restaurant, 'id'>;
            setRestaurantName(foundRestaurant.name);
            
            if (foundRestaurant.generatedMenuJson) {
              try {
                const parsedMenu: DigitalMenu = JSON.parse(foundRestaurant.generatedMenuJson);
                setMenuData(parsedMenu);
              } catch (parseError) {
                console.error("Failed to parse generatedMenuJson:", parseError);
                setError("Παρουσιάστηκε σφάλμα κατά την ανάγνωση του μενού. (Invalid JSON)");
              }
            } else {
              setError("Δεν βρέθηκε ψηφιακό μενού AI για αυτό το εστιατόριο.");
            }
          } else {
            setError("Το εστιατόριο δεν βρέθηκε.");
          }
        } catch (e) {
          console.error("Error fetching from Firestore:", e);
          setError("Παρουσιάστηκε σφάλμα κατά τη φόρτωση των δεδομένων του εστιατορίου.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchMenu();
    } else {
      setError("Μη έγκυρο ID εστιατορίου.");
      setIsLoading(false);
    }
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 selection:bg-accent selection:text-accent-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Φόρτωση μενού...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 selection:bg-accent selection:text-accent-foreground">
        <Card className="w-full max-w-md shadow-lg border-destructive/50">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive-foreground font-headline flex items-center">
              <Frown className="mr-3 h-8 w-8" />
              Σφάλμα
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Επιστροφή στην Αρχική
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!menuData || !restaurantName) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 selection:bg-accent selection:text-accent-foreground">
         <p className="text-lg text-muted-foreground">Δεν υπάρχουν δεδομένα μενού για εμφάνιση.</p>
         <Link href="/" passHref>
            <Button variant="link" className="mt-4">
                Επιστροφή στην Αρχική
            </Button>
         </Link>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground py-12 sm:py-16 px-4">
      <div className="w-full max-w-3xl">
        <header className="mb-10 text-center">
          <div className="mb-6">
             <Link href="/" passHref>
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Επιστροφή στην αναζήτηση
                </Button>
            </Link>
          </div>
          <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary mb-2">
            {restaurantName}
          </h1>
          <p className="text-2xl font-body text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Μενού Καταστήματος (AI)
          </p>
        </header>

        <main>
          {menuData.map((category: MenuCategory) => (
            <section key={category.categoryName} className="mb-10">
              <Card className="shadow-xl border-border/70 overflow-hidden">
                <CardHeader className="bg-primary/10 p-4 sm:p-6">
                  <CardTitle className="text-2xl sm:text-3xl font-headline text-primary">
                    {category.categoryName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {category.items.length === 0 ? (
                     <p className="text-muted-foreground">Δεν υπάρχουν είδη σε αυτή την κατηγορία.</p>
                  ) : (
                    category.items.map((item: MenuItem) => (
                    <div key={item.name} className="pb-4 border-b border-border/40 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="text-lg font-semibold text-foreground flex-1">
                          {item.name}
                        </h3>
                        {item.price && (
                          <p className="text-lg font-bold text-accent whitespace-nowrap">
                            {item.price}
                          </p>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
