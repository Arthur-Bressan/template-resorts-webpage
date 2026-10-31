/** Legacy template defaults; property-specific content is loaded from tenant records. */
export const amenities: Array<{ icon: string; label: string; desc: string }> = [];
export const distances: Array<{ place: string; distance: string; time: string }> = [];
export const directions: Array<{ city: string; route: string; type: string }> = [];

export const sensoryExperience = {
  title: "",
  paragraphs: [] as string[],
};
