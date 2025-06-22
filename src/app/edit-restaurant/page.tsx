
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

import { ArrowLeft, FileText, Image as ImageIcon, Link as LinkIcon, Save, Sparkles, ExternalLink } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";

const MAX_IMAGE_SIZE_MB = 5;
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;
const MAX_PDF_SIZE_MB = 10;
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;

const SESSION_STORAGE_ADMIN_KEY = "menuPeekAdminAuthenticated";

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

const editFormSchema = z.object({
  restaurantName: z.string().min(2, { message: "Το όνομα του εστιατορίου πρέπει να είναι τουλάχιστον 2 χαρακτήρες." }).max(100, {message: "Το όνομα του εστιατορίου δεν πρέπει να υπερβαίνει τους 100 χαρακτήρες."}),
  restaurantLocation: z.string().min(5, { message: "Η τοποθεσία πρέπει να είναι τουλάχιστον 5 χαρακτήρες." }).max(150, {message: "Η τοποθεσία δεν πρέπει να υπερβαίνει τους 150 χαρακτήρες."}),
  restaurantImage: z
    .custom<FileList>()
    .refine((files) => files === undefined || files?.length === 0 || files?.length === 1, "Απαιτείται ένα αρχείο εικόνας εστιατορίου ή κανένα για διατήρηση του υπάρχοντος.")
    .refine((files) => files === undefined || files?.length === 0 || files?.[0]?.type.startsWith("image/"), "Το αρχείο πρέπει να είναι εικόνα (JPEG, PNG, WebP).")
    .refine((files) => files === undefined || files?.length === 0 || files?.[0]?.size <= MAX_IMAGE_SIZE_BYTES, `Το μέγεθος της εικόνας δεν πρέπει να υπερβαίνει τα ${MAX_IMAGE_SIZE_MB}MB.`)
    .optional(),
  menuPdf: z
    .custom<FileList>()
    .refine((files) => files === undefined || files === null || files.length === 0 || files.length === 1, "Μπορείτε να ανεβάσετε μόνο ένα αρχείο PDF ή κανένα για διατήρηση του υπάρχοντος.")
    .refine((files) => files === undefined || files === null || files.length === 0 || files?.[0]?.type === "application/pdf", "Το αρχείο μενού πρέπει να είναι PDF.")
    .refine((files) => files === undefined || files === null || files.length === 0 || files?.[0]?.size <= MAX_PDF_SIZE_BYTES, `Το μέγεθος του PDF δεν πρέπει να υπερβαίνει τα ${MAX_PDF_SIZE_MB}MB.`)
    .optional(),
  menuUrl: z.string().url({ message: "Παρακαλώ εισάγετε ένα έγκυρο URL." }).optional().or(z.literal('')),
  deleteAiMenu: z.boolean().optional(),
});

type FormValues = z.infer<typeof editFormSchema>;

export default function EditRestaurantPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [restaurantToEdit, setRestaurantToEdit] = useState<Restaurant | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;

  const form = useForm<FormValues>({
    resolver: zodResolver(editFormSchema),
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAdminAuthenticated = sessionStorage.getItem(SESSION_STORAGE_ADMIN_KEY);
      if (isAdminAuthenticated !== 'true') {
        router.replace('/admin');
        return;
      }
    }

    if (restaurantId) {
      const fetchRestaurant = async () => {
        if (!db) {
          toast({ variant: "destructive", title: "Σφάλμα", description: "Η βάση δεδομένων δεν είναι διαθέσιμη." });
          router.replace("/admin");
          return;
        }
        try {
          const restaurantDocRef = doc(db, "restaurants", restaurantId);
          const restaurantDoc = await getDoc(restaurantDocRef);

          if (restaurantDoc.exists()) {
            const foundRestaurant = { id: restaurantDoc.id, ...restaurantDoc.data() } as Restaurant;
            setRestaurantToEdit(foundRestaurant);
            
            form.reset({
              restaurantName: foundRestaurant.name,
              restaurantLocation: foundRestaurant.location,
              menuUrl: foundRestaurant.menuUrl || "",
              deleteAiMenu: false,
            });

          } else {
            toast({ variant: "destructive", title: "Σφάλμα", description: "Δεν βρέθηκε το εστιατόριο." });
            router.replace("/admin");
          }
        } catch (error) {
           console.error("Error loading or parsing restaurant data:", error);
           toast({ variant: "destructive", title: "Σφάλμα Φόρτωσης", description: "Πρόβλημα κατά τη φόρτωση δεδομένων." });
           router.replace("/admin");
        }
      };
      fetchRestaurant();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, router, toast]);

  useEffect(() => { 
    if (restaurantToEdit) {
      form.reset({
        restaurantName: restaurantToEdit.name,
        restaurantLocation: restaurantToEdit.location,
        menuUrl: restaurantToEdit.menuUrl || "",
        restaurantImage: undefined, 
        menuPdf: undefined,   
        deleteAiMenu: false,     
      });
    }
  }, [restaurantToEdit, form]);


  async function onSubmit(data: FormValues) {
    if (!restaurantToEdit || !db || !storage) {
      toast({ variant: "destructive", title: "Σφάλμα", description: "Δεν υπάρχει εστιατόριο για επεξεργασία ή η σύνδεση με τη Firebase απέτυχε." });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const updateData: Partial<Restaurant> & { [key: string]: any } = {
        name: data.restaurantName,
        location: data.restaurantLocation,
        menuUrl: data.menuUrl || undefined,
      };

      if (data.restaurantImage && data.restaurantImage.length > 0) {
        const imageFile = data.restaurantImage[0];
        const imageRef = ref(storage, `restaurants/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        updateData.imageUrl = await getDownloadURL(imageRef);
        updateData.imageHint = "restaurant";
      }

      if (data.menuPdf && data.menuPdf.length > 0) {
        const pdfFile = data.menuPdf[0];
        const pdfRef = ref(storage, `menus/${Date.now()}_${pdfFile.name}`);
        await uploadBytes(pdfRef, pdfFile);
        updateData.menuPdfUrl = await getDownloadURL(pdfRef);
      } else if (data.menuPdf === null || (data.menuPdf as any)?.length === 0) {
        updateData.menuPdfUrl = undefined;
      }
      
      if (data.deleteAiMenu) {
        updateData.generatedMenuJson = undefined;
      }

      const restaurantRef = doc(db, "restaurants", restaurantToEdit.id);
      await updateDoc(restaurantRef, updateData);

      toast({
        title: "Επιτυχής Ενημέρωση!",
        description: `Το εστιατόριο "${data.restaurantName}" ενημερώθηκε.`,
      });
      router.push("/admin");

    } catch (error) {
      console.error("Restaurant update error:", error);
      toast({
        variant: "destructive",
        title: "Σφάλμα Ενημέρωσης",
        description: "Απέτυχε το ανέβασμα αρχείου στο Firebase Storage. Ελέγξτε τους κανόνες ασφαλείας (Security Rules) του Storage στο Firebase Console και την κονσόλα του browser για λεπτομέρειες.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (!restaurantToEdit) { 
     return <div className="flex justify-center items-center min-h-screen"><p>Φόρτωση δεδομένων εστιατορίου...</p></div>;
  }


  return (
    <div className="flex flex-col items-center min-h-screen bg-background text-foreground selection:bg-accent selection:text-accent-foreground py-12 sm:py-16 px-4">
       <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-between items-center">
          <Link href="/admin" passHref>
            <Button variant="outline" className="text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Επιστροφή στον Πίνακα Διαχείρισης
            </Button>
          </Link>
        </div>

        <Card className="shadow-xl border-border/70">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-headline text-primary">Επεξεργασία Εστιατορίου: {restaurantToEdit.name}</CardTitle>
            <CardDescription className="text-md text-muted-foreground">
              Ενημερώστε τα στοιχεία του εστιατορίου. Αφήστε τα πεδία αρχείων κενά για να διατηρήσετε τα υπάρχοντα.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="restaurantName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Όνομα Εστιατορίου</FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. Το Στέκι του Γιάννη" {...field} className="text-base py-3"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="restaurantLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Τοποθεσία Εστιατορίου</FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. Αριστοτέλους 15, Αθήνα" {...field} className="text-base py-3"/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="restaurantImage"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center">
                        <ImageIcon className="mr-2 h-5 w-5 text-primary" />
                        Νέα Εικόνα Εστιατορίου (Προαιρετικό - Μορφή: JPG, PNG, WebP - Μέγ. {MAX_IMAGE_SIZE_MB}MB)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => onChange(e.target.files)}
                          onBlur={onBlur}
                          name={name}
                          ref={ref}
                          className="text-base file:font-medium file:text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer h-auto py-2.5"
                        />
                      </FormControl>
                      <FormDescription>
                        Ανεβάστε νέα εικόνα μόνο αν θέλετε να αντικαταστήσετε την υπάρχουσα.
                         {restaurantToEdit.imageUrl && !form.watch("restaurantImage")?.[0] && (
                            <span className="block mt-1 text-xs text-muted-foreground">Τρέχουσα εικόνα: Υπάρχει.</span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="menuPdf"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center">
                        <FileText className="mr-2 h-5 w-5 text-primary" />
                        Νέο Αρχείο Μενού PDF (Προαιρετικό - Μέγ. {MAX_PDF_SIZE_MB}MB)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => onChange(e.target.files)}
                          onBlur={onBlur}
                          name={name}
                          ref={ref}
                          className="text-base file:font-medium file:text-primary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20 cursor-pointer h-auto py-2.5"
                        />
                      </FormControl>
                      <FormDescription>
                        Ανεβάστε νέο PDF μόνο αν θέλετε να αντικαταστήσετε το υπάρχον.
                        {restaurantToEdit.menuPdfUrl && !form.watch("menuPdf")?.[0] && (
                            <span className="block mt-1 text-xs text-muted-foreground">Τρέχον PDF: Υπάρχει.</span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="menuUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center">
                        <LinkIcon className="mr-2 h-5 w-5 text-primary" />
                        Σύνδεσμος Μενού (URL) (Προαιρετικό)
                        </FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. https://www.example.com/menu" {...field} className="text-base py-3"/>
                      </FormControl>
                       <FormDescription>
                        Εισάγετε το πλήρες URL προς το online μενού του εστιατορίου.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {restaurantToEdit.generatedMenuJson && (
                    <FormField
                    control={form.control}
                    name="deleteAiMenu"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/50">
                        <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary"/>Διαχείριση AI Μενού</FormLabel>
                            <FormDescription>
                            Ενεργοποιήστε για να διαγράψετε το υπάρχον μενού που δημιουργήθηκε με AI.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                        </FormItem>
                    )}
                    />
                )}

                <Button type="submit" disabled={isLoading} className="w-full py-3 text-base font-medium rounded-lg shadow-md hover:shadow-lg">
                  <Save className="mr-2 h-5 w-5" />
                  {isLoading ? "Γίνεται ενημέρωση..." : "Αποθήκευση Αλλαγών"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
