'use client';

import { SectionHeader } from '@/components/aftertaste/SectionHeader';
import { MediaCard } from '@/components/aftertaste/MediaCard';
import { EventListItem } from '@/components/aftertaste/EventListItem';
import { CategoryTiles } from '@/components/aftertaste/dashboard/CategoryTiles';
import { StoriesRow } from '@/components/aftertaste/dashboard/StoriesRow';
import { RecipeCard } from '@/components/aftertaste/dashboard/RecipeCard';
import { FindRecipesCard } from '@/components/aftertaste/dashboard/FindRecipesCard';
import {
  recommendedRecipes,
  liveCooks,
  events,
} from '@/data/sample/recipes';

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Page title */}
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left / Main Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Category Tiles */}
          <CategoryTiles />

          {/* Stories Row */}
          <StoriesRow />

          {/* Recommended Recipes */}
          <section>
            <SectionHeader
              title="Recommended Recipes"
              actionLabel="See more"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </section>

          {/* Find Recipes in Seconds */}
          <FindRecipesCard />
        </div>

        {/* Right Rail */}
        <div className="space-y-5">
          {/* Live Cook */}
          <section>
            <SectionHeader title="Live Cook" actionLabel="See more" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
              {liveCooks.map((cook) => (
                <MediaCard
                  key={cook.id}
                  imageSrc={cook.image}
                  title={cook.title}
                  channelName={cook.channelName}
                  isLive={cook.isLive}
                  viewerCount={cook.viewerCount}
                />
              ))}
            </div>
          </section>

          {/* Events */}
          <section>
            <SectionHeader title="Events" actionLabel="See more" />
            <div className="space-y-3">
              {events.map((event) => (
                <EventListItem
                  key={event.id}
                  imageSrc={event.image}
                  location={event.location}
                  title={event.title}
                  date={event.date}
                  time={event.time}
                  attendees={event.attendees}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
