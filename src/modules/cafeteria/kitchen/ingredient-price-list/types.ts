export type { Ingredient, SelectOption } from "../ingredient-registration/types"

export interface FilterOptions {
  brands: { value: string; label: string }[];
  categories: { value: string; label: string }[];
}
