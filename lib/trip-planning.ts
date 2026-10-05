type CampStop = {
  selectedCampgroundId: string | null;
  climbingArea: {
    reviewStatus: string;
    campgroundLinks: Array<{ campgroundId: string; campground: { name: string } }>;
  };
};

export function selectedCampLink<Link extends { campgroundId: string; campground: { name: string } }>(stop: {
  selectedCampgroundId: string | null;
  climbingArea: { reviewStatus: string; campgroundLinks: Link[] };
}): Link | undefined {
  if (stop.climbingArea.reviewStatus !== "reviewed") return undefined;
  return stop.climbingArea.campgroundLinks.find(link => link.campgroundId === stop.selectedCampgroundId);
}

export function campSelectionStatus(stop: CampStop) {
  return selectedCampLink(stop) ? "selected" : stop.selectedCampgroundId ? "reconfirm" : "missing";
}
