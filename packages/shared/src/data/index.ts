import type { CategoryNode } from "../category-types";
import { electronics } from "./electronics";
import { vehicles } from "./vehicles";
import { realestate } from "./realestate";
import { home } from "./home";
import { fashion } from "./fashion";
import { sports } from "./sports";
import { hobby } from "./hobby";
import { baby } from "./baby";
import { business } from "./business";
import { animals } from "./animals";

// Kök gösterim sırası
export const ALL_CATEGORIES: CategoryNode[] = [
  ...electronics,
  ...vehicles,
  ...realestate,
  ...home,
  ...fashion,
  ...sports,
  ...hobby,
  ...baby,
  ...business,
  ...animals,
];
