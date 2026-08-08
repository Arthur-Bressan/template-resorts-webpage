import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
import path from 'path';

const outputDir = './public/images';

async function main() {
  const zai = await ZAI.create();
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const images = [
    { prompt: 'Breathtaking wide shot of a luxury eco-pousada nestled in lush Atlantic forest, wooden chalets with thatched roofs surrounded by tropical greenery, morning mist, golden sunlight filtering through trees, warm and serene atmosphere, professional travel photography, high quality', size: '1440x720' as const, filename: 'hero.jpg' },
    
    { prompt: 'Cozy pousada common area with rustic wooden furniture, warm ambient lighting, fireplace, large windows overlooking tropical garden, terracotta floor tiles, green plants, editorial interior photography, warm tones, inviting atmosphere', size: '1344x768' as const, filename: 'about.jpg' },
    
    { prompt: 'Luxury master suite in a pousada, king bed with white linens, wooden beams on ceiling, large window with forest view, private balcony with hammock, warm natural lighting, elegant but rustic decor, editorial hotel photography', size: '1344x768' as const, filename: 'room-master.jpg' },
    
    { prompt: 'Family chalet in nature pousada, two bedrooms, wooden interior, loft-style, large windows with mountain view, cozy living area, warm earthy tones, spacious and comfortable, professional accommodation photography', size: '1344x768' as const, filename: 'room-chalet.jpg' },
    
    { prompt: 'Garden suite in tropical pousada, bed facing private garden with tropical flowers, glass sliding doors, outdoor shower visible, stone accents, warm sunlight, greenery everywhere, serene and romantic, professional hotel room photography', size: '1344x768' as const, filename: 'room-garden.jpg' },
    
    { prompt: 'Comfortable standard room in pousada, double bed, wooden furniture, clean minimal design, window with partial forest view, soft curtains, warm ambient light, cozy and clean, professional accommodation photography', size: '1344x768' as const, filename: 'room-standard.jpg' },
    
    { prompt: 'Hiking trail through lush Atlantic forest, dappled sunlight, rich green canopy, winding dirt path, tropical plants, morning atmosphere, adventure and nature photography, warm golden light', size: '1024x1024' as const, filename: 'experience-trail.jpg' },
    
    { prompt: 'Luxury spa treatment room in pousada, massage table with white towels, candles, natural stone walls, waterfall feature, tropical flowers, peaceful zen atmosphere, warm soft lighting, wellness photography', size: '1024x1024' as const, filename: 'experience-spa.jpg' },
    
    { prompt: 'Farm-to-table gourmet dinner at pousada restaurant, rustic wooden table, artisan dishes with local ingredients, candlelight, wine glasses, tropical setting, warm inviting atmosphere, editorial food photography', size: '1024x1024' as const, filename: 'experience-gastronomy.jpg' },
    
    { prompt: 'Peaceful boat ride on calm emerald river surrounded by lush tropical forest, misty morning atmosphere, reflections on water, wooden boat, nature photography, serene and contemplative, golden hour lighting', size: '1024x1024' as const, filename: 'experience-boat.jpg' },
    
    { prompt: 'Aerial view of pousada in valley surrounded by Atlantic forest mountains, morning fog, scattered wooden chalets among trees, river in background, dramatic landscape photography, warm golden tones, epic scale', size: '1344x768' as const, filename: 'gallery-1.jpg' },
    
    { prompt: 'Close-up of tropical leaves with water droplets, morning dew on green foliage, bokeh effect with warm light, macro nature photography, lush and vibrant, Atlantic forest detail', size: '1024x1024' as const, filename: 'gallery-2.jpg' },
    
    { prompt: 'Sunset view from pousada terrace, panoramic landscape of forested mountains, warm orange and golden sky, silhouettes of trees, hammock on wooden deck, peaceful evening atmosphere, professional travel photography', size: '1344x768' as const, filename: 'gallery-3.jpg' },
    
    { prompt: 'Breakfast table at pousada with tropical fruits, fresh bread, artisanal jams, coffee, flowers, rustic setup on wooden table, garden view background, warm morning light, editorial lifestyle photography', size: '1024x1024' as const, filename: 'gallery-4.jpg' },
    
    { prompt: 'Wooden suspension bridge crossing a stream in Atlantic forest, hanging vines, ferns, dappled sunlight, mossy rocks below, adventurous and serene, nature photography, warm green tones', size: '768x1344' as const, filename: 'gallery-5.jpg' },
    
    { prompt: 'Infinity pool overlooking forest valley, sunset golden hour, warm water reflection, wooden deck chairs, tropical plants framing the view, luxury eco-hotel atmosphere, professional resort photography', size: '1344x768' as const, filename: 'gallery-6.jpg' },
    
    { prompt: 'Warm bokeh background with tropical garden, golden sunset light filtering through leaves, dreamy atmosphere, nature abstract, warm green and golden tones, premium pousada aesthetic', size: '1440x720' as const, filename: 'cta-bg.jpg' },
    
    { prompt: 'Portrait of happy woman in her 30s, smiling warmly, natural outdoor lighting, casual elegant attire, friendly face, professional portrait photography, warm skin tones, bokeh green nature background', size: '1024x1024' as const, filename: 'avatar-1.jpg' },
    
    { prompt: 'Portrait of friendly man in his 40s, genuine smile, outdoor natural lighting, casual smart attire, warm and approachable, professional portrait photography, soft warm tones, nature background', size: '1024x1024' as const, filename: 'avatar-2.jpg' },
    
    { prompt: 'Portrait of elegant woman in her 50s, warm genuine smile, natural light, sophisticated casual attire, graceful and kind, professional portrait photography, warm golden tones, soft focus background', size: '1024x1024' as const, filename: 'avatar-3.jpg' },
  ];

  console.log(`Generating ${images.length} images...`);

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const outputPath = path.join(outputDir, img.filename);
    
    // Skip if already exists
    if (fs.existsSync(outputPath)) {
      console.log(`  ✓ Skipping (exists): ${img.filename}`);
      continue;
    }

    try {
      console.log(`  Generating ${i + 1}/${images.length}: ${img.filename}...`);
      const response = await zai.images.generations.create({
        prompt: img.prompt,
        size: img.size,
      });
      
      const imageBase64 = response.data[0].base64;
      const buffer = Buffer.from(imageBase64, 'base64');
      fs.writeFileSync(outputPath, buffer);
      console.log(`  ✓ Saved: ${img.filename} (${(buffer.length / 1024).toFixed(0)}KB)`);
    } catch (error: any) {
      console.error(`  ✗ Failed: ${img.filename} - ${error.message}`);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
