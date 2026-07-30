ITEMS=(
  "8track.png" "astro_chicken.png" "atlas.png" "baseball_tickets.png"
  "business_suit.png" "bw_tv.png" "capote.png" "casual_clothes.png"
  "cheeseburger.png" "cola.png" "color_tv.png" "computer.png"
  "concert_tickets.png" "dictionary.png" "dog_food.png" "dress_clothes.png"
  "encyclopedia.png" "food_1week.png" "food_2weeks.png" "food_4weeks.png"
  "freezer.png" "fries.png" "hamburger.png" "hot_tub.png"
  "lottery_tickets.png" "microwave.png" "newspaper.png" "refrigerator.png"
  "shake.png" "stereo.png" "stove.png" "theatre_tickets.png" "vcr.png"
)

# Overwrite everything with the 33 slices
for i in "${!ITEMS[@]}"; do
  cp "scripts/slices/main_${i}.png" "public/assets/raw_images/${ITEMS[$i]}"
done

# The redo ones were:
# 1. baseball tickets (0)
# 2. Encyclopedia (1)
# 3. Two grocery bags (food_2weeks) (2)
# 4. Freezer (3)
# 5. Hamburger (4)
# 6. Hot Tub (5)
# 7. Lottery tickets (6)
cp "scripts/slices/redo_0.png" "public/assets/raw_images/baseball_tickets.png"
cp "scripts/slices/redo_1.png" "public/assets/raw_images/encyclopedia.png"
cp "scripts/slices/redo_2.png" "public/assets/raw_images/food_2weeks.png"
cp "scripts/slices/redo_3.png" "public/assets/raw_images/freezer.png"
cp "scripts/slices/redo_4.png" "public/assets/raw_images/hamburger.png"
cp "scripts/slices/redo_5.png" "public/assets/raw_images/hot_tub.png"
cp "scripts/slices/redo_6.png" "public/assets/raw_images/lottery_tickets.png"
