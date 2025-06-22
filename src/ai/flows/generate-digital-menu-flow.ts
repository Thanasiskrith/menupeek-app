// This file is temporarily blank to resolve build issues.

// We keep the type definitions here so other parts of the app don't break.
// This allows for a clean separation when re-enabling AI features.

import { z } from 'zod';

export const MenuItemSchema = z.object({
  name: z.string().describe('The name of the menu item.'),
  description: z.string().optional().describe('A brief description of the menu item.'),
  price: z.string().optional().describe('The price of the menu item, including currency symbol if available (e.g., "12.50€", "$10").'),
});
export type MenuItem = z.infer<typeof MenuItemSchema>;

export const MenuCategorySchema = z.object({
  categoryName: z.string().describe('The name of the menu category (e.g., Appetizers, Main Courses, Drinks, Desserts).'),
  items: z.array(MenuItemSchema).describe('A list of menu items in this category.'),
});
export type MenuCategory = z.infer<typeof MenuCategorySchema>;

export const DigitalMenuSchema = z.array(MenuCategorySchema);
export type DigitalMenu = z.infer<typeof DigitalMenuSchema>;
