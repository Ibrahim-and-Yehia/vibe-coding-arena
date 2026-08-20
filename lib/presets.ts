// Starting content applied by the onboarding wizard based on business type.
// A plausible starting point the owner is expected to edit. Offered as a
// choice during onboarding — they can also start completely empty.

import type { BusinessType, FloorObjectKind, FloorObjectShape } from "@/lib/types";

export interface PresetMenuItem {
  category: string;
  name: string;
  description?: string;
  price: number;
  prepMinutes: number;
}

export interface PresetFloorObject {
  area: string;
  kind: FloorObjectKind;
  shape: FloorObjectShape;
  label: string;
  seats: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BusinessPreset {
  kitchenLabel: string;
  categories: string[];
  items: PresetMenuItem[];
  areas: string[];
  floorObjects: PresetFloorObject[];
}

const cafe: BusinessPreset = {
  kitchenLabel: "Kitchen",
  categories: ["Coffee & Espresso", "Pastries", "Light Bites", "Cold Drinks"],
  items: [
    { category: "Coffee & Espresso", name: "Espresso", price: 3.0, prepMinutes: 2 },
    { category: "Coffee & Espresso", name: "Cappuccino", price: 4.5, prepMinutes: 3 },
    { category: "Coffee & Espresso", name: "Latte", price: 4.75, prepMinutes: 3 },
    { category: "Coffee & Espresso", name: "Flat White", price: 4.75, prepMinutes: 3 },
    { category: "Pastries", name: "Butter Croissant", price: 3.5, prepMinutes: 1 },
    { category: "Pastries", name: "Blueberry Muffin", price: 3.75, prepMinutes: 1 },
    { category: "Light Bites", name: "Avocado Toast", description: "Sourdough, chili flake, lemon.", price: 7.5, prepMinutes: 6 },
    { category: "Light Bites", name: "Grilled Cheese", price: 6.5, prepMinutes: 7 },
    { category: "Cold Drinks", name: "Iced Latte", price: 5.0, prepMinutes: 3 },
    { category: "Cold Drinks", name: "Fresh Orange Juice", price: 4.5, prepMinutes: 2 },
  ],
  areas: ["Main Room", "Patio"],
  floorObjects: [
    { area: "Main Room", kind: "kitchen", shape: "rect_fixture", label: "Kitchen", seats: 0, x: 20, y: 20, w: 160, h: 120 },
    { area: "Main Room", kind: "bar", shape: "rect_fixture", label: "Counter", seats: 0, x: 20, y: 160, w: 160, h: 70 },
    { area: "Main Room", kind: "entrance", shape: "rect", label: "Entrance", seats: 0, x: 700, y: 20, w: 60, h: 40 },
    { area: "Main Room", kind: "table", shape: "stool", label: "B1", seats: 1, x: 200, y: 175, w: 32, h: 32 },
    { area: "Main Room", kind: "table", shape: "stool", label: "B2", seats: 1, x: 200, y: 215, w: 32, h: 32 },
    { area: "Main Room", kind: "table", shape: "round", label: "1", seats: 2, x: 280, y: 60, w: 64, h: 64 },
    { area: "Main Room", kind: "table", shape: "round", label: "2", seats: 2, x: 400, y: 60, w: 64, h: 64 },
    { area: "Main Room", kind: "table", shape: "round", label: "3", seats: 2, x: 520, y: 60, w: 64, h: 64 },
    { area: "Main Room", kind: "table", shape: "square", label: "4", seats: 4, x: 280, y: 190, w: 84, h: 84 },
    { area: "Main Room", kind: "table", shape: "square", label: "5", seats: 4, x: 420, y: 190, w: 84, h: 84 },
    { area: "Patio", kind: "table", shape: "round", label: "P1", seats: 2, x: 80, y: 60, w: 64, h: 64 },
    { area: "Patio", kind: "table", shape: "round", label: "P2", seats: 2, x: 200, y: 60, w: 64, h: 64 },
  ],
};

const restaurant: BusinessPreset = {
  kitchenLabel: "Kitchen",
  categories: ["Starters", "Mains", "Desserts", "Drinks"],
  items: [
    { category: "Starters", name: "Soup of the Day", price: 7.0, prepMinutes: 5 },
    { category: "Starters", name: "House Salad", price: 8.5, prepMinutes: 6 },
    { category: "Mains", name: "Grilled Chicken", description: "Seasonal vegetables, jus.", price: 17.0, prepMinutes: 15 },
    { category: "Mains", name: "Pan-Seared Salmon", price: 21.0, prepMinutes: 15 },
    { category: "Mains", name: "Vegetable Pasta", price: 15.5, prepMinutes: 12 },
    { category: "Mains", name: "Classic Burger", price: 14.5, prepMinutes: 13 },
    { category: "Desserts", name: "Cheesecake", price: 7.5, prepMinutes: 3 },
    { category: "Desserts", name: "Chocolate Brownie", price: 6.5, prepMinutes: 4 },
    { category: "Drinks", name: "House Wine (glass)", price: 8.0, prepMinutes: 2 },
    { category: "Drinks", name: "Soft Drink", price: 3.5, prepMinutes: 1 },
  ],
  areas: ["Dining Room", "Terrace"],
  floorObjects: [
    { area: "Dining Room", kind: "kitchen", shape: "rect_fixture", label: "Kitchen", seats: 0, x: 20, y: 20, w: 200, h: 150 },
    { area: "Dining Room", kind: "entrance", shape: "rect", label: "Entrance", seats: 0, x: 780, y: 20, w: 60, h: 40 },
    { area: "Dining Room", kind: "restroom", shape: "rect", label: "WC", seats: 0, x: 780, y: 460, w: 60, h: 50 },
    { area: "Dining Room", kind: "table", shape: "round", label: "1", seats: 2, x: 280, y: 60, w: 70, h: 70 },
    { area: "Dining Room", kind: "table", shape: "round", label: "2", seats: 2, x: 410, y: 60, w: 70, h: 70 },
    { area: "Dining Room", kind: "table", shape: "round", label: "3", seats: 4, x: 550, y: 55, w: 90, h: 90 },
    { area: "Dining Room", kind: "table", shape: "square", label: "4", seats: 4, x: 280, y: 190, w: 90, h: 90 },
    { area: "Dining Room", kind: "table", shape: "square", label: "5", seats: 4, x: 420, y: 190, w: 90, h: 90 },
    { area: "Dining Room", kind: "table", shape: "rect", label: "6", seats: 6, x: 560, y: 190, w: 150, h: 90 },
    { area: "Dining Room", kind: "table", shape: "round", label: "7", seats: 2, x: 280, y: 330, w: 70, h: 70 },
    { area: "Terrace", kind: "table", shape: "round", label: "T1", seats: 2, x: 100, y: 80, w: 70, h: 70 },
    { area: "Terrace", kind: "table", shape: "round", label: "T2", seats: 2, x: 250, y: 80, w: 70, h: 70 },
    { area: "Terrace", kind: "table", shape: "square", label: "T3", seats: 4, x: 100, y: 220, w: 90, h: 90 },
  ],
};

const bar: BusinessPreset = {
  kitchenLabel: "Bar",
  categories: ["Beer", "Cocktails", "Wine", "Bar Bites"],
  items: [
    { category: "Beer", name: "Draft Lager", price: 6.0, prepMinutes: 2 },
    { category: "Beer", name: "IPA", price: 7.0, prepMinutes: 2 },
    { category: "Cocktails", name: "Old Fashioned", price: 11.0, prepMinutes: 4 },
    { category: "Cocktails", name: "Margarita", price: 10.0, prepMinutes: 4 },
    { category: "Cocktails", name: "Mojito", price: 10.0, prepMinutes: 5 },
    { category: "Wine", name: "House Red", price: 8.0, prepMinutes: 2 },
    { category: "Wine", name: "House White", price: 8.0, prepMinutes: 2 },
    { category: "Bar Bites", name: "Loaded Nachos", price: 9.5, prepMinutes: 8 },
    { category: "Bar Bites", name: "Buffalo Wings", price: 10.5, prepMinutes: 12 },
  ],
  areas: ["Main Bar", "Lounge"],
  floorObjects: [
    { area: "Main Bar", kind: "bar", shape: "rect_fixture", label: "Bar", seats: 0, x: 20, y: 20, w: 300, h: 90 },
    { area: "Main Bar", kind: "entrance", shape: "rect", label: "Entrance", seats: 0, x: 780, y: 20, w: 60, h: 40 },
    { area: "Main Bar", kind: "restroom", shape: "rect", label: "WC", seats: 0, x: 780, y: 460, w: 60, h: 50 },
    { area: "Main Bar", kind: "table", shape: "stool", label: "B1", seats: 1, x: 40, y: 130, w: 32, h: 32 },
    { area: "Main Bar", kind: "table", shape: "stool", label: "B2", seats: 1, x: 90, y: 130, w: 32, h: 32 },
    { area: "Main Bar", kind: "table", shape: "stool", label: "B3", seats: 1, x: 140, y: 130, w: 32, h: 32 },
    { area: "Main Bar", kind: "table", shape: "stool", label: "B4", seats: 1, x: 190, y: 130, w: 32, h: 32 },
    { area: "Main Bar", kind: "table", shape: "square", label: "1", seats: 4, x: 380, y: 60, w: 90, h: 90 },
    { area: "Main Bar", kind: "table", shape: "square", label: "2", seats: 4, x: 520, y: 60, w: 90, h: 90 },
    { area: "Main Bar", kind: "table", shape: "square", label: "3", seats: 4, x: 380, y: 200, w: 90, h: 90 },
    { area: "Lounge", kind: "table", shape: "round", label: "L1", seats: 4, x: 100, y: 80, w: 90, h: 90 },
    { area: "Lounge", kind: "table", shape: "round", label: "L2", seats: 4, x: 260, y: 80, w: 90, h: 90 },
  ],
};

export const BUSINESS_PRESETS: Record<BusinessType, BusinessPreset> = { cafe, restaurant, bar };

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  cafe: "Cafe",
  restaurant: "Restaurant",
  bar: "Bar",
};
