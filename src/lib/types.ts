export type Plant = {
  id: string;
  name: string;
  icon: string;
  started_at: string | null;
  archived: boolean;
};

export type RecordRow = {
  id: string;
  kind: "care" | "cooking";
  plant_id: string | null;
  recorded_at: string;
  water_changed: boolean;
  nutrient_added: boolean;
  harvested: boolean;
  repotted: boolean;
  pinched: boolean;
  thinned: boolean;
  comment: string | null;
  record_photos: { photo_path: string; sort_order: number }[];
  record_plants: { plant_id: string }[];
  created_by: string;
  profiles: { display_name: string; color: string } | null;
};
