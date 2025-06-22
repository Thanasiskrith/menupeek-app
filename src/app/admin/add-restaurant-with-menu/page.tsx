
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

import { ArrowLeft, FileText, Image as ImageIcon, Link as LinkIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const SESSION_STORAGE_ADMIN_KEY = "menuPeekAdminAuthenticated";

interface NewRestaurant {
  name: string;
  location: string;
  imageUrl: string;
  imageHint: string;
  menuPdfUrl?: string;
  menuUrl?: string;
}

const formSchema = z.object({
  restaurantName: z.string().min(2, { message: "Το όνομα του εστιατορίου πρέπει να είναι τουλάχιστον 2 χαρακτήρες." }).max(100),
  restaurantLocation: z.string().min(5, { message: "Η τοποθεσία πρέπει να είναι τουλάχιστον 5 χαρακτήρες." }).max(150),
  restaurantImage: z
    .custom<FileList>()
    .refine((files) => files?.length === 1, "Απαιτείται αρχείο εικόνας εστιατορίου.")
    .refine((files) => files?.[0]?.type.startsWith("image/"), "Το αρχείο πρέπει να είναι εικόνα.")
    .refine((files) => files?.[0]?.size <= MAX_IMAGE_SIZE_BYTES, `Το μέγεθος της εικόνας δεν πρέπει να υπερβαίνει τα ${MAX_IMAGE_SIZE_MB}MB.`),
  menuUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL." }).optional().or(z.literal('')),
  menuPdfNoAi: z
    .custom<FileList>()
    .optional()
    .refine((files) => !files || files.length === 0 || files.length === 1, "Ένα PDF μόνο.")
    .refine((files) => !files || files.length === 0 || files?.[0]?.type === "application/pdf", "Πρέπει να είναι PDF.")
    .refine((files) => !files || files.length === 0 || files?.[0]?.size <= MAX_PDF_SIZE_BYTES, `Το μέγεθος PDF δεν πρέπει να υπερβαίνει ${MAX_PDF_SIZE_MB}MB.`),
}).refine(data => data.menuUrl || data.menuPdfNoAi?.length, {
    message: "Πρέπει να παρέχετε είτε URL μενού είτε αρχείο PDF.",
    path: ["menuUrl"],
}).refine(data => !(data.menuUrl && data.menuPdfNoAi?.length), {
    message: "Δεν μπορείτε να παρέχετε ταυτόχρονα URL μενού και αρχείο PDF.",
    path: ["menuUrl"],
});


type FormValues = z.infer<typeof formSchema>;

export default function AddRestaurantWithSimpleMenuPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAdminAuthenticated = sessionStorage.getItem(SESSION_STORAGE_ADMIN_KEY);
      if (isAdminAuthenticated !== 'true') {
        router.replace('/admin');
      }
    }
  }, [router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantName: "",
      restaurantLocation: "",
      restaurantImage: undefined,
      menuUrl: "",
      menuPdfNoAi: undefined,
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);
    if (!db || !storage) {
      toast({
        variant: "destructive",
        title: "Σφάλμα Ρύθμισης",
        description: "Η σύνδεση με τη βάση δεδομένων απέτυχε. Ελέγξτε τη ρύθμιση της Firebase.",
      });
      setIsLoading(false);
      return;
    }

    try {
      // 1. Upload restaurant image to Firebase Storage
      const imageFile = data.restaurantImage[0];
      const imageRef = ref(storage, `restaurants/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      // 2. Upload PDF menu to Firebase Storage if it exists
      let menuPdfUrl: string | undefined = undefined;
      if (data.menuPdfNoAi && data.menuPdfNoAi.length > 0) {
        const pdfFile = data.menuPdfNoAi[0];
        const pdfRef = ref(storage, `menus/${Date.now()}_${pdfFile.name}`);
        await uploadBytes(pdfRef, pdfFile);
        menuPdfUrl = await getDownloadURL(pdfRef);
      }

      // 3. Create restaurant object with URLs from Storage
      const newRestaurant: NewRestaurant = {
        name: data.restaurantName,
        location: data.restaurantLocation,
        imageUrl: imageUrl,
        imageHint: "restaurant",
        menuPdfUrl: menuPdfUrl,
        menuUrl: data.menuUrl || undefined,
      };

      // 4. Save to Firestore
      await addDoc(collection(db, "restaurants"), newRestaurant);

      toast({
        title: "Επιτυχής Προσθήκη!",
        description: `Το εστιατόριο "${data.restaurantName}" προστέθηκε με το απλό μενού του.`,
      });
      form.reset();
      router.push("/admin");

    } catch (error: any) {
      console.error("Error adding restaurant:", error);
      toast({
        variant: "destructive",
        title: "Σφάλμα Προσθήκης",
        description: "Απέτυχε το ανέβασμα αρχείου στο Firebase Storage. Ελέγξτε τους κανόνες ασφαλείας (Security Rules) του Storage στο Firebase Console και την κονσόλα του browser για λεπτομέρειες.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground py-12 sm:py-16 px-4">
       <div className="w-full max-w-2xl">
        <div className="mb-8">
          <Link href="/admin" passHref>
            <Button variant="outline" className="text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Επιστροφή στον Πίνακα Διαχείρισης
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-headline text-primary">Προσθήκη Νέου Εστιατορίου (Απλό Μενού)</CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              Συμπληρώστε τα στοιχεία του εστιατορίου και παρέχετε ένα URL μενού ή ένα αρχείο PDF.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField control={form.control} name="restaurantName" render={({ field }) => (<FormItem><FormLabel className="text-base">Όνομα Εστιατορίου</FormLabel><FormControl><Input placeholder="π.χ. Το Στέκι του Γιάννη" {...field} className="text-base py-3"/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="restaurantLocation" render={({ field }) => (<FormItem><FormLabel className="text-base">Τοποθεσία Εστιατορίου</FormLabel><FormControl><Input placeholder="π.χ. Αριστοτέλους 15, Αθήνα" {...field} className="text-base py-3"/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="restaurantImage" render={({ field: { onChange, value, ...fieldProps } }) => (<FormItem><FormLabel className="text-base flex items-center"><ImageIcon className="mr-2 h-5 w-5 text-primary" />Εικόνα Εστιατορίου (Μέγ. {MAX_IMAGE_SIZE_MB}MB)</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...fieldProps} className="text-base file:font-medium file:text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer h-auto py-2.5"/></FormControl><FormMessage /></FormItem>)} />
                
                <FormField control={form.control} name="menuUrl" render={({ field }) => (<FormItem><FormLabel className="text-base flex items-center"><LinkIcon className="mr-2 h-5 w-5 text-primary" />URL Μενού (Προαιρετικό)</FormLabel><FormControl><Input placeholder="https://www.example.com/menu" {...field} className="text-base py-3"/></FormControl><FormDescription>Αν το εστιατόριο έχει online μενού, δώστε το URL εδώ.</FormDescription><FormMessage /></FormMessage>)} />
                
                <FormField control={form.control} name="menuPdfNoAi" render={({ field: { onChange, value, ...fieldProps } }) => (<FormItem><FormLabel className="text-base flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Ανέβασμα PDF (Απλό - Προαιρετικό - Μέγ. {MAX_PDF_SIZE_MB}MB)</FormLabel><FormControl><Input type="file" accept="application/pdf" onChange={(e) => onChange(e.target.files)} {...fieldProps} className="text-base file:font-medium file:text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer h-auto py-2.5"/></FormControl><FormDescription>Ανεβάστε το αρχείο PDF του μενού. Θα αποθηκευτεί ως έχει.</FormDescription><FormMessage /></FormItem>)} />

                <Button type="submit" disabled={isLoading} className="w-full py-3 text-base font-medium rounded-lg shadow-md hover:shadow-lg">
                  <Save className="mr-2 h-5 w-5" />
                  {isLoading ? "Γίνεται αποθήκευση..." : "Αποθήκευση Εστιατορίου"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
