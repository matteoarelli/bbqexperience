/**
 * Script di seeding contenuti per BBQ Experience Strapi CMS.
 * Crea prodotti, recensioni, ricette, tutorial e blog post via REST API.
 */

const API_URL = "https://cms.bbq-experience.com/api";
const API_TOKEN = "60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9";

// --- Utility ---

async function apiPost(endpoint, data) {
  const res = await fetch(`${API_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
    body: JSON.stringify({ data }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(json.error || json, null, 2));
  }
  return json;
}

function log(ok, type, name) {
  const icon = ok ? "\u2705" : "\u274C";
  console.log(`${icon} [${type}] ${name}`);
}

// ============================================================
// PRODUCTS
// ============================================================

const products = [
  {
    name: "Weber Summit S-470 Gas Grill",
    slug: "weber-summit-s-470-gas-grill",
    brand: "Weber",
    category: "grill",
    price_range: "premium",
    description:
      "<p>The Weber Summit S-470 is a flagship gas grill that embodies decades of American grilling innovation. With four stainless steel burners producing 48,800 BTU, a dedicated sear station burner, a smoker burner, and a rear-mounted infrared rotisserie burner, this grill handles everything from delicate fish fillets to full packer briskets with effortless precision.</p><p>The expansive 580 square inches of primary cooking space, complemented by a warming rack, gives you room to cook for large gatherings without compromise. The enclosed cart features stainless steel doors, LED-lit control knobs for nighttime grilling, and a built-in thermometer for monitoring ambient temperature.</p>",
    specifications: {
      fuel_type: "Propane / Natural Gas",
      total_btu: "48,800 BTU main + 12,000 BTU sear + 10,600 BTU smoker + 10,600 BTU rotisserie",
      primary_cooking_area_sq_in: 580,
      total_cooking_area_sq_in: 838,
      burners: 4,
      dimensions_inches: "66.5 x 30 x 57",
      weight_lbs: 282,
      ignition: "Snap-Jet individual burner ignition",
      warranty: "10 years (limited)",
      made_in: "USA",
    },
    affiliate_url: "https://www.weber.com/US/en/grills/gas-grills/summit-series/",
  },
  {
    name: "Traeger Ironwood 885 Pellet Smoker",
    slug: "traeger-ironwood-885-pellet-smoker",
    brand: "Traeger",
    category: "smoker",
    price_range: "premium",
    description:
      "<p>The Traeger Ironwood 885 represents the pinnacle of pellet smoking technology. Featuring Traeger's D2 direct-drive drivetrain and WiFIRE smart connectivity, this smoker delivers consistent heat and clean smoke flavor at the touch of a button -- or a tap on your phone from anywhere in the world.</p><p>With 885 square inches of cooking space spread across a main grate and a secondary rack, you can smoke up to eight racks of ribs, six whole chickens, or a full competition load simultaneously. The double-walled stainless steel interior and downdraft exhaust system ensure even heat distribution, virtually eliminating hot spots that plague lesser smokers.</p>",
    specifications: {
      fuel_type: "Hardwood Pellets",
      cooking_area_sq_in: 885,
      temperature_range: "165-500°F",
      hopper_capacity_lbs: 20,
      drivetrain: "D2 Direct Drive",
      connectivity: "WiFIRE (Wi-Fi + Bluetooth)",
      construction: "Double-walled stainless steel interior",
      dimensions_inches: "54 x 27 x 55",
      weight_lbs: 175,
      warranty: "3 years",
    },
    affiliate_url: "https://www.traeger.com/pellet-grills/ironwood/885",
  },
  {
    name: "ThermoWorks Thermapen ONE",
    slug: "thermoworks-thermapen-one",
    brand: "ThermoWorks",
    category: "thermometer",
    price_range: "mid-range",
    description:
      "<p>The ThermoWorks Thermapen ONE is the undisputed king of instant-read thermometers, trusted by professional pitmasters and competition BBQ teams worldwide. Delivering a full reading in just one second with ±0.5°F accuracy, it takes the guesswork out of every cook.</p><p>The redesigned sensor uses a thermocouple rather than a thermistor, providing the fastest and most accurate readings available in a handheld thermometer. The auto-rotating backlit display, IP67 waterproof rating, and 2,000-hour battery life from a single AAA make this an indispensable tool at any grill station.</p>",
    specifications: {
      sensor_type: "Thermocouple (Type K)",
      accuracy: "±0.5°F (±0.3°C)",
      speed: "1 second full reading",
      range: "-58 to 572°F (-49.9 to 299.9°C)",
      resolution: "0.1°",
      waterproof_rating: "IP67",
      battery: "Single AAA, ~2000 hours",
      display: "Auto-rotating backlit",
      probe_length_inches: 4.5,
      weight_oz: 3.1,
    },
    affiliate_url: "https://www.thermoworks.com/thermapen-one/",
  },
  {
    name: "Jealous Devil Lump Charcoal",
    slug: "jealous-devil-lump-charcoal",
    brand: "Jealous Devil",
    category: "fuel",
    price_range: "mid-range",
    description:
      "<p>Jealous Devil is a premium all-natural hardwood lump charcoal sourced from sustainably harvested South American hardwoods including Quebracho Blanco, one of the densest woods on the planet. This density translates directly to longer burn times, higher heat output, and far less ash than competing charcoals.</p><p>Each bag is hand-selected to ensure large, restaurant-grade pieces with minimal dust and fragments. It lights easily with a chimney starter, reaches grilling temperature in about 15 minutes, and burns hot enough for serious searing while remaining manageable for low-and-slow sessions. Completely free of chemicals, fillers, and binders.</p>",
    specifications: {
      type: "100% Natural Hardwood Lump Charcoal",
      wood_species: "Quebracho Blanco & selected South American hardwoods",
      burn_time: "Up to 4+ hours",
      max_temperature: "1,172°F+ (633°C+)",
      bag_sizes: "8 lb, 20 lb, 35 lb",
      additives: "None - no chemicals, fillers, or binders",
      ash_production: "Very low (~3%)",
      sourcing: "FSC-certified sustainable forestry",
      country_of_origin: "Paraguay",
    },
    affiliate_url: "https://jealousdevil.com/",
  },
  {
    name: "GrillGrate Sear Station",
    slug: "grillgrate-sear-station",
    brand: "GrillGrate",
    category: "accessory",
    price_range: "mid-range",
    description:
      "<p>The GrillGrate Sear Station transforms any grill -- gas, charcoal, pellet, or kamado -- into a steakhouse-quality searing machine. These interlocking hard-anodized aluminum panels sit directly on top of your existing grates, concentrating heat through raised rails that produce picture-perfect sear marks while the valleys between rails capture and vaporize drippings for enhanced flavor.</p><p>The patented design amplifies temperatures by 100-200°F above your grill's ambient temperature, letting you achieve true 800°F+ searing on grills that normally max out at 500°F. Each panel is CNC-machined for precision fit and comes with the signature GrateTool -- a custom spatula designed to slide perfectly between the rails.</p>",
    specifications: {
      material: "Hard-anodized aluminum",
      panel_sizes: "Multiple sizes to fit most grills (13.75\" to 20.75\")",
      rail_height_inches: 0.375,
      valley_width_inches: 0.3125,
      heat_amplification: "+100-200°F above ambient",
      compatible_grills: "Gas, charcoal, pellet, kamado (universal)",
      includes: "GrateTool spatula",
      dishwasher_safe: false,
      made_in: "USA",
      warranty: "Lifetime",
    },
    affiliate_url: "https://www.grillgrate.com/",
  },
  {
    name: "Kamado Joe Classic III",
    slug: "kamado-joe-classic-iii",
    brand: "Kamado Joe",
    category: "grill",
    price_range: "luxury",
    description:
      "<p>The Kamado Joe Classic III is the third generation of the ceramic cooker that redefined what a kamado can do. Built with thick-walled, heat-resistant ceramic and featuring the patented SloRoller Hyperbolic Smoke Chamber insert, it produces some of the most flavorful and evenly cooked barbecue you will ever taste.</p><p>The revolutionary Divide & Conquer flexible cooking system lets you configure up to three tiers of cooking grates at different heights, enabling simultaneous multi-zone cooking. The air-lift hinge makes the heavy ceramic lid feel weightless, while the Kontrol Tower top vent provides precise airflow adjustments for temperatures from 225°F low-and-slow all the way to 750°F pizza-oven searing.</p>",
    specifications: {
      fuel_type: "Lump Charcoal",
      cooking_surface_sq_in: 406,
      temperature_range: "225°F - 750°F+",
      shell_material: "Heat-resistant ceramic",
      wall_thickness_inches: 1.25,
      grate_system: "Divide & Conquer Flexible Cooking System (3 tiers)",
      smoke_system: "SloRoller Hyperbolic Smoke Chamber",
      hinge: "Air Lift Hinge (counterbalanced)",
      top_vent: "Kontrol Tower (rain-proof, precision airflow)",
      weight_lbs: 250,
      warranty: "Lifetime (ceramic), 5 years (metal)",
    },
    affiliate_url: "https://www.kamadojoe.com/products/classic-joe-iii",
  },
];

// ============================================================
// REVIEWS
// ============================================================

const reviews = [
  {
    title: "Weber Summit S-470 Review: The Gas Grill That Does It All",
    slug: "weber-summit-s-470-review",
    published_date: "2026-03-15",
    excerpt: "Weber's flagship gas grill combines raw power with refined engineering, delivering a versatile cooking experience that satisfies both weekend warriors and serious pitmasters.",
    editorial_content: `<h2>First Impressions and Build Quality</h2>
<p>Unboxing the Weber Summit S-470 is an event in itself. At 282 pounds fully assembled, this grill makes a statement before you even fire it up. The stainless steel construction gleams under sunlight, and every panel, door, and handle feels solid and precisely fitted. Assembly took us roughly three hours with two people -- not trivial, but the instructions are clear and every bolt has a purpose.</p>
<p>The enclosed cart design sets the Summit apart from open-frame grills. The stainless steel doors hide a generous storage area, and the side shelves fold down when not in use for tighter spaces. Weber includes two tool hooks and a paper towel holder -- small touches that reflect years of listening to griller feedback.</p>

<h2>Performance on the Grill</h2>
<p>The four main burners deliver 48,800 BTU across 580 square inches of primary cooking surface, and heat distribution is remarkably even. We tested with an array of six thermometers across the grate and found temperature variation of less than 15°F from edge to edge -- a testament to Weber's burner tube and Flavorizer Bar engineering.</p>
<p>The dedicated sear station is where this grill truly distinguishes itself. Located between the two left burners, the infrared sear burner cranks out concentrated heat that rivals a restaurant broiler. We achieved 900°F+ surface temperatures with steaks placed directly over the sear zone, producing a deep, mahogany crust in under 90 seconds per side while keeping the interior a perfect medium-rare.</p>
<p>The built-in smoker box and dedicated smoker burner are genuine game-changers for a gas grill. We loaded the box with cherry wood chips and maintained 250°F across the main cooking area for six hours, smoking a full rack of St. Louis ribs that rivaled our charcoal results. The smoke ring was lighter than what you get with a dedicated offset, but the flavor penetration was genuine and satisfying.</p>

<h3>Rotisserie Capabilities</h3>
<p>The rear-mounted infrared rotisserie burner puts out 10,600 BTU of radiant heat, and the included rotisserie kit handles chickens, roasts, and even whole legs of lamb with ease. We rotisserie-roasted a 5-pound chicken that emerged with impossibly crispy skin and juicy meat throughout -- one of the best birds we have produced on any grill.</p>

<h2>Ease of Use and Cleanup</h2>
<p>The Snap-Jet ignition system lights each burner independently and reliably. In six months of testing, we never experienced a failed ignition -- not once. The LED-illuminated control knobs are a practical luxury for evening cooks, making temperature adjustments effortless after dark.</p>
<p>Cleanup is straightforward thanks to the angled Flavorizer Bars, which channel grease into a removable drip tray. The bars themselves do accumulate carbon over time, but a quick scrape during preheating keeps them functional. The grates, while heavy, are dishwasher-safe for occasional deep cleans.</p>

<h2>Where It Falls Short</h2>
<p>At this price point, there are few genuine complaints, but they exist. The built-in thermometer in the lid, while convenient, reads 20-30°F higher than our calibrated probe thermometers -- a common issue with dome thermometers. We strongly recommend ignoring it in favor of a dedicated probe. The side burner, while functional for sauces and sides, feels like an afterthought compared to the main cooking system. And the sheer size and weight mean this grill is a permanent installation -- plan its placement carefully.</p>

<h2>The Bottom Line</h2>
<p>The Weber Summit S-470 is the Swiss Army knife of gas grills. It grills, sears, smokes, roasts, and rotisserie-cooks with equal confidence. If you want a single grill that handles every technique and does each one well, this is it. The price is steep, but the build quality and performance justify every dollar for serious outdoor cooks.</p>`,
    verdict: "The Weber Summit S-470 is the most versatile and capable gas grill we have ever tested, excelling at every cooking technique from searing to smoking.",
    score_overall: 9.2,
    score_build_quality: 9.5,
    score_performance: 9.3,
    score_value: 8.5,
    score_ease_of_use: 9.0,
    pros: [
      "Exceptional heat distribution across the entire cooking surface",
      "Built-in sear station reaches true steakhouse temperatures",
      "Smoker burner and box produce genuine smoke flavor on a gas grill",
      "Bombproof stainless steel construction built to last decades",
    ],
    cons: [
      "Premium price puts it out of reach for casual grillers",
      "Built-in lid thermometer is inaccurate by 20-30°F",
      "Extremely heavy at 282 lbs -- essentially a permanent installation",
    ],
    _productSlug: "weber-summit-s-470-gas-grill",
  },
  {
    title: "Traeger Ironwood 885 Review: Set-It-and-Forget-It Smoking Perfected",
    slug: "traeger-ironwood-885-review",
    published_date: "2026-03-10",
    excerpt: "Traeger's Ironwood 885 combines massive cooking capacity with smartphone-level convenience, making competition-quality smoked meat accessible to everyone.",
    editorial_content: `<h2>The Pellet Promise, Delivered</h2>
<p>Pellet smokers have always promised effortless smoking, but the Traeger Ironwood 885 is the first model we have tested that truly delivers on that promise without meaningful compromise. The D2 direct-drive drivetrain feeds pellets with variable-speed precision, and the combination of an induction fan and downdraft exhaust maintains temperatures within ±5°F of your set point -- better than many high-end offset smokers in the hands of experienced pitmasters.</p>
<p>We ran the Ironwood through three months of rigorous testing, cooking everything from 14-hour briskets to quick-seared burgers, and the consistency of results was remarkable. Cook after cook, the temperature held steady, the smoke was clean, and the food was outstanding.</p>

<h2>Smart Connectivity That Actually Works</h2>
<p>WiFIRE connectivity is Traeger's headline feature, and unlike many IoT devices that feel like technology for technology's sake, this one genuinely improves the cooking experience. Setting temperature, monitoring internal meat probes, and receiving alerts all happen through a polished mobile app that works reliably over Wi-Fi. We monitored an overnight pork shoulder from bed, adjusting temperature at 3 AM without leaving the warmth of our blankets.</p>
<p>The Wifire app also includes hundreds of recipes with timed cook programs. Select a recipe, follow the prompts, and the smoker adjusts temperature automatically through each phase of the cook. It is an incredible resource for beginners who want guided results while they build experience.</p>

<h3>Temperature Range and Versatility</h3>
<p>The Ironwood operates from 165°F to 500°F, covering everything from cold-smoking cheese at the low end to searing steaks at the high end. At full blast, it won't match a dedicated charcoal sear, but at 500°F with the grates preheated, we produced respectable grill marks and decent Maillard crust on strip steaks. For smoking, the 225-275°F sweet spot is where this machine truly shines.</p>

<h2>Build Quality and Design</h2>
<p>The double-walled stainless steel interior is the Ironwood's secret weapon. This insulation means the smoker holds temperature even in cold weather, and our winter tests at 35°F ambient showed only a 3°F deviation from set temperature -- impressive for any smoker, let alone a pellet unit. The exterior is powder-coated steel that has held up well through rain, snow, and summer sun with no signs of rust or fading.</p>
<p>The 20-pound hopper provides approximately 20 hours of cook time at 225°F, meaning even the longest brisket cooks require no pellet refill. The magnetic-latch hopper lid seals tightly to protect pellets from moisture.</p>

<h2>Where It Struggles</h2>
<p>No pellet smoker, no matter how advanced, replicates the depth of smoke flavor you get from a stick-burner offset with seasoned hardwood splits. The Ironwood produces cleaner, lighter smoke -- which many people actually prefer -- but traditional BBQ purists may find it lacking. The pellet dependency also means ongoing fuel costs: premium pellets run $1-2 per pound, and a long cook can consume 20-40 pounds.</p>
<p>The drip tray system works but requires attention. If you run a long, fatty cook without emptying the drip bucket, overflow is possible. We learned this lesson the hard way with a 10-pound pork shoulder. Additionally, while the 500°F max is fine for general grilling, it cannot deliver the 700°F+ searing that charcoal and gas grills achieve.</p>

<h2>Verdict</h2>
<p>The Traeger Ironwood 885 is the best pellet smoker we have tested. It removes the learning curve from smoking without removing the quality, and the smart features are genuinely useful rather than gimmicky. If you want phenomenal smoked meat with minimal babysitting, this is your cooker.</p>`,
    verdict: "The Traeger Ironwood 885 makes world-class smoking effortless, delivering consistent, competition-worthy results with smartphone convenience.",
    score_overall: 9.0,
    score_build_quality: 9.0,
    score_performance: 9.2,
    score_value: 8.5,
    score_ease_of_use: 9.5,
    pros: [
      "D2 drivetrain holds temperature within ±5°F for hours on end",
      "WiFIRE app is polished, reliable, and genuinely useful",
      "885 sq in of cooking space handles competition-size loads",
      "Double-walled insulation performs in cold weather",
    ],
    cons: [
      "Lighter smoke flavor compared to stick-burner offsets",
      "500°F max limits high-heat searing capability",
      "Ongoing pellet cost adds up over time",
      "Drip tray needs monitoring on long, fatty cooks",
    ],
    _productSlug: "traeger-ironwood-885-pellet-smoker",
  },
  {
    title: "ThermoWorks Thermapen ONE Review: The Only Thermometer You Need",
    slug: "thermoworks-thermapen-one-review",
    published_date: "2026-03-05",
    excerpt: "One-second readings, ±0.5°F accuracy, and bomb-proof build quality make the Thermapen ONE the gold standard of instant-read thermometers.",
    editorial_content: `<h2>Speed Is Everything</h2>
<p>In barbecue, every second you hold the lid open costs you heat, smoke, and moisture. The ThermoWorks Thermapen ONE delivers a full, stable temperature reading in one second -- not two, not three, but genuinely one. We timed it repeatedly with a stopwatch, and it consistently stabilized within 0.8 to 1.1 seconds of insertion. This might sound like a marginal improvement over the original Thermapen MK4's three-second reading, but in practice, it transforms how you check meat. Quick probe, instant number, lid closed.</p>
<p>The speed comes from ThermoWorks' redesigned thermocouple sensor, which uses a thinner junction point for faster thermal response. The tradeoff -- theoretically reduced durability of the thinner sensor -- has not manifested in our year-long testing. The probe tip remains accurate and responsive after hundreds of uses.</p>

<h2>Accuracy You Can Trust</h2>
<p>We tested the Thermapen ONE against a NIST-traceable reference thermometer across a range from 32°F (ice water) to 400°F (deep-frying oil). At every checkpoint, the Thermapen ONE read within ±0.5°F of the reference -- exactly as ThermoWorks promises. This level of accuracy is critical when cooking poultry (where 165°F is safe but 170°F is dry) or pulling a brisket at exactly 203°F for optimal tenderness.</p>
<p>The auto-rotating display is a thoughtful engineering detail. No matter how you hold the thermometer -- right-handed, left-handed, upside-down -- the screen reorients so the numbers are always right-side-up. The backlight activates automatically in low light, and the large digits are readable at arm's length.</p>

<h3>Build and Ergonomics</h3>
<p>The folding probe design protects the sensor during storage and automatically powers the unit on when deployed. The body is IP67 waterproof, meaning you can rinse it under running water or even drop it in a sink without worry. We intentionally submerged ours for five minutes, dried it off, and it read perfectly. The rubberized grip is comfortable even with greasy hands, and the overall weight of 3.1 ounces feels substantial without being heavy.</p>

<h2>Battery Life That Defies Expectations</h2>
<p>ThermoWorks claims 2,000 hours from a single AAA battery, and based on our usage patterns, that figure is conservative. After 11 months of regular weekend use -- roughly 300 probing sessions -- our original battery still shows full charge. There is also an intelligent motion-sensing sleep mode that powers down the unit after five minutes of inactivity, preventing battery drain if you forget to fold the probe closed.</p>

<h2>The Competition</h2>
<p>At $105, the Thermapen ONE costs three to five times more than budget instant-read thermometers from Amazon. Is it worth it? Unequivocally yes. We tested it alongside a $25 competitor and found the cheap unit was 4°F off at 165°F and took seven seconds to stabilize. Over the course of a year of grilling, those inaccuracies add up to overcooked chicken, undercooked pork, and frustration. The Thermapen ONE pays for itself in saved food.</p>

<h2>Minor Quibbles</h2>
<p>The Thermapen ONE does one thing, and it does it perfectly. It does not have wireless connectivity, leave-in probe capability, or multi-channel monitoring. If you want those features, you need a separate product like the ThermoWorks Signals. The price, while justified by performance, is a barrier for casual grillers who might not appreciate the difference. And the color options, while fun, fade slightly with prolonged UV exposure if left outdoors.</p>

<h2>Final Take</h2>
<p>The ThermoWorks Thermapen ONE is the single most important tool in any BBQ arsenal. Speed, accuracy, and durability combine into a product that eliminates guessing and guarantees precision on every cook. Buy one, and you will never wonder if your meat is done again.</p>`,
    verdict: "The Thermapen ONE is the single most important BBQ tool you can own -- one-second accuracy that eliminates all guesswork.",
    score_overall: 9.5,
    score_build_quality: 9.0,
    score_performance: 10.0,
    score_value: 8.5,
    score_ease_of_use: 9.5,
    pros: [
      "Genuine one-second readings -- the fastest instant-read available",
      "±0.5°F accuracy verified against NIST-traceable references",
      "IP67 waterproof rating survives full submersion",
      "2,000+ hour battery life from a single AAA",
    ],
    cons: [
      "Premium price at $105 may deter casual grillers",
      "No wireless or leave-in probe functionality",
      "Color finish fades with prolonged sun exposure",
    ],
    _productSlug: "thermoworks-thermapen-one",
  },
  {
    title: "Jealous Devil Lump Charcoal Review: The Fuel That Burns Longer and Hotter",
    slug: "jealous-devil-lump-charcoal-review",
    published_date: "2026-02-28",
    excerpt: "Made from ultra-dense South American hardwoods, Jealous Devil burns hotter and longer than any lump charcoal we have tested, with almost no ash left behind.",
    editorial_content: `<h2>Why Charcoal Choice Matters</h2>
<p>Most backyard grillers grab whatever charcoal is on sale and never think twice. But the fuel you burn is the foundation of every cook. It determines heat output, burn duration, ash production, and -- critically -- the flavor imparted to your food. After testing over a dozen premium lump charcoals in controlled conditions, Jealous Devil stands in a class of its own.</p>
<p>Sourced from Quebracho Blanco and other dense South American hardwoods grown in sustainably managed forests in Paraguay, this charcoal is extraordinarily dense. A single piece the size of your fist weighs noticeably more than comparable pieces from other brands. That density translates directly into performance.</p>

<h2>Burn Time and Heat Output</h2>
<p>We loaded identical amounts (5 pounds) of Jealous Devil and three competing premium brands into identical Weber Kettle grills and lit them simultaneously using chimney starters. Jealous Devil reached grilling temperature (450°F at grate level) in 14 minutes -- comparable to other quality brands. But where it separated itself was duration: the Jealous Devil maintained temperatures above 400°F for 2 hours and 45 minutes, versus 1 hour and 50 minutes for the next-best competitor.</p>
<p>At its peak, we measured grate temperatures of 725°F with the vents fully open -- more than enough for serious searing. For low-and-slow cooks on a kamado, we maintained 250°F for over six hours on a single load without adding fuel, using only vent adjustments to control temperature.</p>

<h3>Ash Production</h3>
<p>This is where Jealous Devil truly embarrasses the competition. After burning through 10 pounds of charcoal, the remaining ash barely covered the bottom of the grill -- roughly 3% of the original volume. Competing brands left 8-15% ash residue. Less ash means better airflow, more consistent temperatures, and less cleanup. It is a meaningful practical advantage on long cooks.</p>

<h2>Piece Size and Consistency</h2>
<p>Opening a bag of Jealous Devil reveals large, uniform pieces with minimal dust and fragments. In our 20-pound bag, the smallest piece was roughly the size of a golf ball, and most pieces were fist-sized or larger. Compare this to brands where half the bag can be marble-sized fragments that burn fast and clog your vents with ash. The consistency speaks to the hand-selection process Jealous Devil emphasizes in their production.</p>

<h2>Flavor and Aroma</h2>
<p>Quebracho burns remarkably clean, producing thin blue smoke rather than the billowing white smoke that indicates incomplete combustion. The flavor contribution is subtle -- a mild, slightly sweet woodiness that enhances rather than overwhelms the meat. It pairs well with any protein and never imparts the acrid, chemical taste that lesser charcoals can produce. If you want more aggressive smoke flavor, this is an ideal base fuel over which to add smoking wood chunks.</p>

<h2>What We Did Not Love</h2>
<p>Price is the elephant in the room. Jealous Devil costs roughly $2.00 per pound at retail, compared to $1.00-1.50 for other premium brands and $0.50 for commodity lump charcoal. You are paying double for better performance, and whether that value equation works depends on how seriously you take your charcoal cooking. The bags are also denser and heavier than you expect, which makes handling the 35-pound bag a workout. Finally, availability is inconsistent -- specialty stores and online retailers carry it, but your local big-box may not.</p>

<h2>Our Assessment</h2>
<p>Jealous Devil is the best lump charcoal we have ever used. It burns hotter, longer, and cleaner than anything else on the market, with negligible ash and neutral flavor that lets your food and technique shine. If charcoal is your fuel of choice, this is the brand to buy.</p>`,
    verdict: "Jealous Devil is the best lump charcoal available -- it burns hotter, lasts longer, and produces less ash than any competitor we have tested.",
    score_overall: 9.0,
    score_build_quality: 9.5,
    score_performance: 9.5,
    score_value: 7.5,
    score_ease_of_use: 8.5,
    pros: [
      "Burns 50% longer than competing premium lump charcoals",
      "Only ~3% ash residue -- virtually no cleanup",
      "Large, hand-selected pieces with minimal dust",
      "Clean-burning with neutral flavor profile",
    ],
    cons: [
      "Roughly double the price of other premium lump brands",
      "Retail availability is inconsistent outside online stores",
      "Heavy bags are awkward to handle, especially the 35 lb size",
    ],
    _productSlug: "jealous-devil-lump-charcoal",
  },
  {
    title: "GrillGrate Sear Station Review: Turn Any Grill Into a Searing Beast",
    slug: "grillgrate-sear-station-review",
    published_date: "2026-02-20",
    excerpt: "These ingenious aluminum panels amplify your grill's heat by up to 200°F, producing steakhouse-quality sear marks on any cooker -- even a pellet smoker.",
    editorial_content: `<h2>The Problem GrillGrate Solves</h2>
<p>Every pellet smoker owner knows the frustration: your brisket comes out with incredible smoke flavor, but when you want to sear a steak, the 450-500°F max temperature produces a pale, lackluster crust. Gas grill owners face a similar limitation -- most consumer grills cap out well below the 700°F+ temperatures that steakhouses use for that perfect char. GrillGrate panels solve this problem with elegant engineering.</p>
<p>The concept is simple: raised aluminum rails absorb and concentrate heat from below, creating a searing surface significantly hotter than the ambient grill temperature. The valleys between rails capture drippings, which vaporize and baste the food with flavor. It is infrared cooking meets grill-mark precision.</p>

<h2>Installation and Compatibility</h2>
<p>Setup is dead simple. You measure your existing grate, order the corresponding GrillGrate panels, and lay them directly on top of your current grates. They interlock like puzzle pieces for stability and can be removed just as easily. We tested panels on a Traeger Ironwood 885 (pellet), a Weber Spirit (gas), and a Kamado Joe Classic III (charcoal), and the fit was excellent on all three.</p>
<p>The hard-anodized aluminum construction is lightweight but durable. After six months of heavy use, our panels show cosmetic darkening but zero warping, corrosion, or performance degradation. The included GrateTool spatula is purpose-designed to slide between the rails, making food removal easy and keeping the cooking surface clean.</p>

<h3>Heat Amplification in Practice</h3>
<p>We measured surface temperatures on the GrillGrate rails using an infrared thermometer across all three test grills. The results were consistent and dramatic:</p>
<ul>
<li><strong>Traeger Ironwood at 500°F setting:</strong> Rail surface reached 685°F -- a 185°F amplification</li>
<li><strong>Weber Spirit at max:</strong> Rail surface reached 745°F -- a 195°F amplification</li>
<li><strong>Kamado Joe at 600°F:</strong> Rail surface reached 790°F -- a 190°F amplification</li>
</ul>
<p>These temperatures are firmly in steakhouse territory. The sear marks produced are deep, defined, and caramelized -- the kind of crust that makes people ask what restaurant you ordered from.</p>

<h2>Cooking Results</h2>
<p>We seared over 30 steaks across our test grills using the GrillGrate panels. The results were uniformly excellent. Ribeyes developed a thick Maillard crust in 2 minutes per side at 700°F+ rail temperatures, while the interiors remained a perfect medium-rare. The raised rail design also prevents the steak from sitting in a pool of rendered fat, which can cause flare-ups and greasy, steamed texture on flat grates.</p>
<p>Beyond steaks, we found the GrillGrate panels excel at burgers (the rails create neat patty marks while the valleys catch drippings), skin-on chicken thighs (the amplified heat crisps skin beautifully), and even vegetables like asparagus and zucchini (defined marks without falling through the grate).</p>

<h2>Limitations</h2>
<p>The rail design creates specific sear lines rather than an all-over crust. If you prefer the uniform char you get from a flat-top or cast-iron surface, GrillGrate's pattern may not appeal to you. Cleaning between the rails requires the GrateTool or a dedicated brush -- a standard grill brush will not work well. The aluminum also cannot be cleaned with harsh chemical oven cleaners. And while the panels are reasonably priced individually, outfitting a large grill with full coverage can add up to $150-200.</p>

<h2>Final Assessment</h2>
<p>GrillGrate panels are the single best aftermarket upgrade you can make to any grill. They transform mediocre searing performance into something genuinely impressive, and they work on virtually every cooker on the market. If your grill's sear game disappoints you, this is the fix.</p>`,
    verdict: "GrillGrate panels are the most impactful grill upgrade available -- they add 200°F of searing power to any cooker for the price of a nice steak dinner.",
    score_overall: 8.8,
    score_build_quality: 8.5,
    score_performance: 9.5,
    score_value: 9.0,
    score_ease_of_use: 8.5,
    pros: [
      "Amplifies grill temperature by 100-200°F for steakhouse-quality searing",
      "Universal fit works on gas, charcoal, pellet, and kamado grills",
      "Raised rail design prevents flare-ups and produces clean sear marks",
      "Durable hard-anodized aluminum shows no warping after months of use",
    ],
    cons: [
      "Creates rail-pattern sear marks rather than uniform all-over crust",
      "Cleaning between the narrow rails requires the dedicated GrateTool",
      "Full grill coverage can cost $150-200 for larger cooking surfaces",
    ],
    _productSlug: "grillgrate-sear-station",
  },
  {
    title: "Kamado Joe Classic III Review: The Ceramic Cooker That Masters Everything",
    slug: "kamado-joe-classic-iii-review",
    published_date: "2026-02-15",
    excerpt: "With the revolutionary SloRoller smoke system and Divide & Conquer cooking, the Kamado Joe Classic III is the most versatile charcoal cooker ever built.",
    editorial_content: `<h2>A New Generation of Kamado</h2>
<p>The kamado -- a thick-walled ceramic cooker inspired by ancient Japanese cooking vessels -- has been the darling of the BBQ world for years. But the Kamado Joe Classic III pushes the concept further than we thought possible. This third-generation model introduces the SloRoller Hyperbolic Smoke Chamber, a revolutionary insert that changes how heat and smoke move through the cooking chamber, and the results speak for themselves.</p>
<p>The Classic III arrives well-packaged and mostly assembled. You'll need to attach the side shelves, install the ash drawer, and position the internal components, which takes about 30 minutes. At 250 pounds, this is a two-person job for moving into position, but the included rolling cart with locking casters makes post-placement mobility painless.</p>

<h2>The SloRoller Difference</h2>
<p>The SloRoller is a stainless steel insert that sits above the firebox and redirects heat and smoke in a cyclonic pattern before it reaches your food. Traditional kamados direct heat straight up from the charcoal, which can create hot spots directly above the fire. The SloRoller eliminates this entirely.</p>
<p>We placed nine identical chicken thighs across every section of the cooking grate and measured internal temperatures as they cooked. The result: all nine thighs reached 165°F internal within a 3-minute window of each other. On a standard kamado without the SloRoller, we typically see a 10-15 minute spread. The practical implication is massive -- you no longer need to rotate food during a cook.</p>
<p>The smoke distribution improvement is equally dramatic. Briskets smoked with the SloRoller developed uniform smoke rings measuring 8-10mm deep across the entire surface. Without it, the smoke ring was 12mm on the side facing the fire and only 4mm on the opposite side.</p>

<h3>Divide & Conquer Flexibility</h3>
<p>The three-tier Divide & Conquer system lets you place half-moon grate sections at different heights, creating up to three independent cooking zones. We regularly used a setup with a deflector plate on the lowest tier (for indirect heat), a grate with a brisket on the middle tier, and a grate with beans and cornbread on the top tier. Everything cooked simultaneously and finished beautifully.</p>

<h2>Temperature Control</h2>
<p>Ceramic kamados are inherently excellent at temperature stability due to their thermal mass, and the Classic III is no exception. Once stabilized at 250°F, it held that temperature for 14 hours during an overnight brisket cook, with fluctuations of less than ±8°F -- and we did not touch the vents once during that period.</p>
<p>The Kontrol Tower top vent provides precise airflow adjustment with a rain cap that prevents water from entering the cooker during unexpected weather. The bottom draft door features a fine-mesh screen and a sliding plate for coarse and fine adjustments. Together, these controls make temperature management intuitive even for beginners.</p>
<p>On the high end, the Classic III reaches 750°F+ with vents fully open, which is searing territory. We baked Neapolitan-style pizzas at 700°F that rivaled our local pizzeria -- blistered, charred crust in under 3 minutes.</p>

<h2>Where It Could Improve</h2>
<p>The ceramic construction, while excellent for heat retention, is fragile if mishandled. A dropped lid or a tip-over would likely crack the shell. The air-lift hinge mitigates this by making the lid feel weightless, but careful handling is still required. Charcoal kamado cooking also has a steeper learning curve than gas or pellet -- managing fire, airflow, and temperature simultaneously takes practice. Finally, the 406 square inches of primary cooking surface, while adequate for most families, is modest compared to large offset smokers or pellet grills. You cannot fit a full competition load without using all three Divide & Conquer tiers creatively.</p>

<h2>The Definitive Kamado</h2>
<p>The Kamado Joe Classic III is the best kamado we have ever used, and arguably the most versatile charcoal cooker on the market. The SloRoller alone justifies the upgrade from previous generations, and the Divide & Conquer system turns a single cooker into a multi-zone cooking station. It smokes, grills, sears, bakes, and roasts with equal mastery. If you are willing to invest the time to learn charcoal cooking, no other single cooker will reward you more generously.</p>`,
    verdict: "The Kamado Joe Classic III is the most versatile charcoal cooker on the market, with the SloRoller delivering the most even heat and smoke distribution we have ever measured.",
    score_overall: 9.4,
    score_build_quality: 9.5,
    score_performance: 9.5,
    score_value: 8.5,
    score_ease_of_use: 8.0,
    pros: [
      "SloRoller produces the most even heat and smoke distribution of any kamado",
      "Divide & Conquer system enables simultaneous multi-zone cooking",
      "Temperature stability holds ±8°F for 14+ hours without vent adjustments",
      "Reaches 750°F+ for pizza baking and high-heat searing",
    ],
    cons: [
      "Ceramic shell is fragile and could crack if dropped or tipped",
      "Steeper learning curve than gas or pellet cookers",
      "406 sq in primary cooking area limits capacity for large gatherings",
    ],
    _productSlug: "kamado-joe-classic-iii",
  },
];

// ============================================================
// RECIPES
// ============================================================

const recipes = [
  {
    title: "Texas-Style Smoked Brisket",
    slug: "texas-style-smoked-brisket",
    published_date: "2026-03-20",
    excerpt: "The definitive guide to smoking a whole packer brisket with nothing but salt, pepper, and patience -- Central Texas style.",
    difficulty: "hard",
    technique: "smoking",
    meat_type: "beef",
    prep_time: 30,
    cook_time: 840,
    total_time: 870,
    servings: 16,
    editorial_intro: `<h2>The King of BBQ</h2>
<p>If there is a single dish that defines American barbecue, it is the smoked beef brisket. Born in the meat markets of Central Texas, where German and Czech immigrants married Old World butchering traditions with slow-smoking techniques, brisket has become the ultimate test of a pitmaster's skill and patience. A well-smoked brisket -- with its dark, peppery bark, rosy smoke ring, and meltingly tender interior that pulls apart with the gentlest tug -- is a transcendent eating experience.</p>
<p>This recipe follows the purist Central Texas approach: a simple rub of coarse black pepper and kosher salt (the legendary "Dalmatian rub"), post oak smoke, and time. No injection, no wrapping in foil (though we include the optional Texas Crutch for those who prefer it), no fancy sauces. Just beef, smoke, salt, and pepper. The technique demands attention -- you will need to manage fire, monitor temperature, and make judgment calls about when the meat is ready -- but the reward is unlike anything else in outdoor cooking.</p>
<p>Choose a USDA Choice or Prime whole packer brisket weighing 12-16 pounds. The packer includes both the flat (leaner, more uniform) and the point (fattier, more marbled). Do not trim too aggressively; a quarter-inch fat cap protects the flat during the long cook. And start early -- a 14-hour cook plus resting time means you should fire up your smoker before dawn for a dinner-time meal.</p>`,
    ingredients: [
      { name: "Whole packer brisket (USDA Choice or Prime)", quantity: "14", unit: "lbs" },
      { name: "Coarse black pepper (16-mesh)", quantity: "1/2", unit: "cup" },
      { name: "Kosher salt (Diamond Crystal)", quantity: "1/4", unit: "cup" },
      { name: "Post oak wood splits or chunks", quantity: "8", unit: "lbs" },
      { name: "Yellow mustard (binder, optional)", quantity: "2", unit: "tbsp" },
      { name: "Beef tallow (for wrapping, optional)", quantity: "4", unit: "oz" },
      { name: "Butcher paper (pink, unwaxed)", quantity: "1", unit: "roll" },
    ],
    instructions: [
      { step_number: 1, description: "Remove brisket from packaging and pat dry. Trim the fat cap to approximately 1/4 inch thickness, removing any hard chunks of fat. Square off the edges of the flat to promote even cooking. Remove the large crescent-shaped fat deposit between the point and flat from the top side." },
      { step_number: 2, description: "Mix coarse black pepper and kosher salt in a shaker. If using mustard as a binder, apply a thin coat to all surfaces. Apply the rub generously on all sides, pressing it into the meat. Let the brisket sit at room temperature for 1 hour while you prepare the smoker." },
      { step_number: 3, description: "Start your smoker and stabilize at 250°F using post oak as your primary smoke wood. For offset smokers, build a coal bed and add splits every 45-60 minutes. For kamado or other charcoal cookers, use oak chunks placed throughout the charcoal." },
      { step_number: 4, description: "Place brisket fat-side up (or fat-side down if your heat source is directly below) on the smoker grate. Insert a leave-in probe thermometer into the thickest part of the flat, avoiding fat pockets. Close the lid and resist the urge to open it for at least 3 hours." },
      { step_number: 5, description: "Maintain 225-275°F smoker temperature for the first 6-8 hours. The bark will develop gradually -- look for a dark mahogany color and a dry, firm surface. The internal temperature will likely stall around 150-170°F (the dreaded 'stall'). This is normal and can last 2-4 hours." },
      { step_number: 6, description: "Optional Texas Crutch: When the bark is set and internal temp reaches 165-170°F, wrap the brisket in pink butcher paper (not foil, which can make the bark soggy). If using tallow, drizzle it over the brisket before wrapping. Return to the smoker." },
      { step_number: 7, description: "Continue cooking until the internal temperature reaches 200-205°F AND the probe slides into the meat with no resistance -- like inserting it into warm butter. Temperature alone is not enough; the 'probe tender' test is critical. This typically happens between 200-210°F." },
      { step_number: 8, description: "Remove the brisket and rest it in a cooler (no ice) lined with old towels for a minimum of 1 hour, ideally 2-4 hours. The internal temperature will continue to rise slightly, then gradually drop. Resting redistributes juices throughout the meat." },
      { step_number: 9, description: "Slice the flat against the grain in pencil-thick slices (about 1/4 inch). Separate the point from the flat, rotate it 90 degrees (the grain runs perpendicular), and slice the point against its grain. Serve immediately with white bread, pickles, onions, and your preferred BBQ sauce on the side." },
    ],
  },
  {
    title: "Smoked Baby Back Ribs with Honey Glaze",
    slug: "smoked-baby-back-ribs-honey-glaze",
    published_date: "2026-03-18",
    excerpt: "Tender, smoky baby back ribs with a sweet honey glaze -- the quintessential backyard BBQ crowd-pleaser using the reliable 3-2-1 method.",
    difficulty: "medium",
    technique: "smoking",
    meat_type: "pork",
    prep_time: 20,
    cook_time: 360,
    total_time: 380,
    servings: 6,
    editorial_intro: `<h2>The Crowd-Pleaser</h2>
<p>Baby back ribs are the gateway drug of barbecue. Shorter and more tender than spare ribs, they cook faster, are more forgiving of technique errors, and deliver that irresistible combination of smoky bark, tender meat, and sweet glaze that makes guests close their eyes with every bite. If brisket is the PhD of BBQ, baby backs are the rewarding introductory course.</p>
<p>This recipe uses a modified 3-2-1 method -- 3 hours of open smoke, 2 hours wrapped to tenderize, and 1 hour unwrapped to set the glaze. We shorten the wrap phase slightly for baby backs (which are more tender than spare ribs) to prevent the meat from becoming mushy. The honey-butter glaze applied in the final hour caramelizes into a sticky, lacquered coating that balances sweetness with the peppery, smoky rub underneath.</p>
<p>The key to great ribs is not complicated: steady temperature, good smoke, and knowing when to pull them off. The bend test is your friend -- pick up the rack with tongs at the center, and if the meat cracks on the surface but does not fall apart, they are perfect. Ribs should be tender, not falling off the bone -- that means they are overcooked.</p>`,
    ingredients: [
      { name: "Baby back rib racks", quantity: "3", unit: "racks" },
      { name: "Yellow mustard (binder)", quantity: "3", unit: "tbsp" },
      { name: "Brown sugar", quantity: "1/2", unit: "cup" },
      { name: "Paprika (smoked)", quantity: "3", unit: "tbsp" },
      { name: "Black pepper", quantity: "2", unit: "tbsp" },
      { name: "Garlic powder", quantity: "1", unit: "tbsp" },
      { name: "Onion powder", quantity: "1", unit: "tbsp" },
      { name: "Kosher salt", quantity: "1", unit: "tbsp" },
      { name: "Cayenne pepper", quantity: "1", unit: "tsp" },
      { name: "Honey", quantity: "1/2", unit: "cup" },
      { name: "Unsalted butter", quantity: "4", unit: "tbsp" },
      { name: "Apple cider vinegar", quantity: "2", unit: "tbsp" },
      { name: "Apple juice (for spritzing)", quantity: "1", unit: "cup" },
      { name: "Cherry or apple wood chunks", quantity: "4", unit: "chunks" },
    ],
    instructions: [
      { step_number: 1, description: "Remove the membrane from the bone side of each rack by sliding a butter knife under the membrane at one end, gripping it with a paper towel, and pulling it off in one piece. This allows smoke and seasoning to penetrate from both sides." },
      { step_number: 2, description: "Apply a thin layer of yellow mustard to all surfaces of each rack. Combine brown sugar, smoked paprika, black pepper, garlic powder, onion powder, salt, and cayenne in a bowl. Apply the rub generously on both sides, pressing it into the meat. Let rest for 30 minutes." },
      { step_number: 3, description: "Preheat your smoker to 225°F. Add cherry or apple wood chunks for a mild, sweet smoke flavor. Place the ribs bone-side down on the grate, meat-side up. Close the lid." },
      { step_number: 4, description: "Smoke for 3 hours at 225°F, spritzing with apple juice every 45 minutes after the first 90 minutes. The bark should be developing a deep mahogany color and the meat should have pulled back from the bone tips by about 1/4 inch." },
      { step_number: 5, description: "Lay out three large sheets of heavy-duty aluminum foil. Place each rack meat-side down on the foil. Drizzle each with a tablespoon of honey and a pat of butter. Wrap tightly and return to the smoker, seam-side up. Cook for 1.5 to 2 hours." },
      { step_number: 6, description: "While the ribs are wrapped, prepare the glaze: melt butter in a saucepan, add honey and apple cider vinegar, and stir until combined. Keep warm." },
      { step_number: 7, description: "Unwrap the ribs carefully (steam will escape). Place them back on the smoker meat-side up. Brush generously with the honey glaze. Cook for 45 minutes to 1 hour, applying a second coat of glaze after 30 minutes. The glaze should become tacky and caramelized." },
      { step_number: 8, description: "Test for doneness using the bend test: pick up the rack at center with tongs. If the surface cracks but the rack does not fall apart, they are ready. Let rest for 10 minutes, then slice between the bones and serve." },
    ],
  },
  {
    title: "Grilled Argentinian Chimichurri Steak",
    slug: "grilled-argentinian-chimichurri-steak",
    published_date: "2026-03-12",
    excerpt: "Thick-cut ribeye grilled over blazing charcoal and drowned in vibrant, herbaceous chimichurri -- the essence of Argentine asado.",
    difficulty: "easy",
    technique: "grilling",
    meat_type: "beef",
    prep_time: 15,
    cook_time: 15,
    total_time: 30,
    servings: 4,
    editorial_intro: `<h2>The Art of Argentine Fire</h2>
<p>In Argentina, grilling is not a hobby -- it is a cultural institution. The asado, a social gathering centered around fire-cooked meat, is the beating heart of Argentine identity. And at the center of every great asado is a thick steak kissed by flames and crowned with chimichurri -- the bright, herby, garlicky condiment that is to Argentine grilling what ketchup is to American burgers, only infinitely more interesting.</p>
<p>This recipe strips the asado tradition to its purest form: a bone-in ribeye (or your preferred thick-cut steak), seasoned only with coarse salt, grilled over ripping-hot charcoal, and served with freshly made chimichurri. The chimichurri does all the heavy lifting in the flavor department -- fresh flat-leaf parsley, oregano, garlic, red wine vinegar, and olive oil combine into a condiment so vibrant and punchy that it transforms even a mediocre steak into something extraordinary.</p>
<p>The critical technique here is high heat and restraint. Argentine grillers let the fire do the work, flipping the steak only once, and relying on the quality of the meat and the chimichurri to deliver flavor. No marinades, no complex rubs, no fussy sauces. Just beef, salt, fire, and herbs. Simplicity elevated to art.</p>`,
    ingredients: [
      { name: "Bone-in ribeye steaks (1.5 inches thick)", quantity: "4", unit: "steaks" },
      { name: "Coarse sea salt", quantity: "2", unit: "tbsp" },
      { name: "Fresh flat-leaf parsley (finely chopped)", quantity: "1", unit: "cup" },
      { name: "Fresh oregano (finely chopped)", quantity: "2", unit: "tbsp" },
      { name: "Garlic cloves (minced)", quantity: "6", unit: "cloves" },
      { name: "Red wine vinegar", quantity: "1/4", unit: "cup" },
      { name: "Extra-virgin olive oil", quantity: "1/2", unit: "cup" },
      { name: "Red pepper flakes", quantity: "1", unit: "tsp" },
      { name: "Black pepper (freshly cracked)", quantity: "1", unit: "tsp" },
      { name: "Lump charcoal", quantity: "5", unit: "lbs" },
    ],
    instructions: [
      { step_number: 1, description: "Make the chimichurri at least 30 minutes before grilling (ideally 2-4 hours). Combine chopped parsley, oregano, minced garlic, red pepper flakes, and black pepper in a bowl. Add red wine vinegar and stir. Pour in olive oil and mix thoroughly. Season with a pinch of salt. Let it rest at room temperature -- never refrigerate chimichurri just before serving, as cold dulls the flavors." },
      { step_number: 2, description: "Remove steaks from the refrigerator 45 minutes before cooking. Pat them completely dry with paper towels. Season aggressively with coarse sea salt on all sides. The thick-grained salt will create pockets of seasoning and help form the crust." },
      { step_number: 3, description: "Light a full chimney of lump charcoal and let it burn until fully ashed over (about 15-20 minutes). Pour the coals into one side of the grill, creating a two-zone setup with direct high heat on one side and indirect heat on the other. The grate should be screaming hot -- you should not be able to hold your hand 4 inches above the grate for more than 2 seconds." },
      { step_number: 4, description: "Place steaks over the direct-heat zone. Do not touch them for 4 minutes. You will hear aggressive sizzling -- that is the Maillard reaction creating your crust. After 4 minutes, flip once. Cook for another 3-4 minutes for medium-rare (130°F internal), or adjust to your preference." },
      { step_number: 5, description: "If the steaks need more time to reach your target temperature but the crust is already dark, move them to the indirect zone and close the lid. Let them coast up to temperature gently. For thick bone-in ribeyes, this reverse approach often yields the best results." },
      { step_number: 6, description: "Remove steaks to a cutting board and rest for 8-10 minutes. The internal temperature will rise 5-7°F during resting. Slice against the grain if desired, or serve whole. Spoon chimichurri generously over the top and serve the rest on the side. Pair with a Malbec." },
    ],
  },
  {
    title: "Smoked Mac and Cheese",
    slug: "smoked-mac-and-cheese",
    published_date: "2026-03-08",
    excerpt: "Creamy, smoky, bubbling mac and cheese cooked entirely on the smoker -- the ultimate BBQ side dish that steals the show.",
    difficulty: "easy",
    technique: "smoking",
    meat_type: "vegetarian",
    prep_time: 20,
    cook_time: 90,
    total_time: 110,
    servings: 8,
    editorial_intro: `<h2>The Side Dish That Becomes the Star</h2>
<p>Every pitmaster knows the truth: sometimes the sides outshine the main event. Smoked mac and cheese is proof of this phenomenon. Take an already-beloved comfort food, cook it in a smoker where it absorbs wood smoke while the cheese bubbles and the top develops a golden, slightly crunchy crust, and you have a dish that makes guests forget about the brisket entirely -- at least for a few bites.</p>
<p>This recipe produces a creamy, rich mac and cheese with a three-cheese blend of sharp cheddar, Gruyere, and cream cheese, all infused with real smoke flavor from your cooker. The key technique is using a disposable aluminum pan, which maximizes surface area for smoke absorption, and cooking uncovered for the final portion to develop that irresistible crusty top layer.</p>
<p>Timing-wise, this is designed to share smoker space with whatever protein you are cooking. It works beautifully at 225-275°F alongside brisket, pork shoulder, or ribs. Start it 90 minutes before you plan to serve, and it will be ready exactly when you need it. The recipe scales easily for large groups -- just use a bigger pan and add 15-20 minutes to the cook time.</p>`,
    ingredients: [
      { name: "Elbow macaroni", quantity: "1", unit: "lb" },
      { name: "Sharp cheddar cheese (shredded)", quantity: "3", unit: "cups" },
      { name: "Gruyere cheese (shredded)", quantity: "1", unit: "cup" },
      { name: "Cream cheese", quantity: "8", unit: "oz" },
      { name: "Whole milk", quantity: "1.5", unit: "cups" },
      { name: "Heavy cream", quantity: "1/2", unit: "cup" },
      { name: "Eggs (beaten)", quantity: "2", unit: "large" },
      { name: "Unsalted butter", quantity: "3", unit: "tbsp" },
      { name: "Smoked paprika", quantity: "1", unit: "tsp" },
      { name: "Dry mustard powder", quantity: "1", unit: "tsp" },
      { name: "Garlic powder", quantity: "1/2", unit: "tsp" },
      { name: "Kosher salt", quantity: "1", unit: "tsp" },
      { name: "Black pepper", quantity: "1/2", unit: "tsp" },
      { name: "Panko breadcrumbs", quantity: "1/2", unit: "cup" },
    ],
    instructions: [
      { step_number: 1, description: "Boil macaroni in salted water until just barely al dente (about 1-2 minutes less than package directions). The pasta will continue cooking on the smoker, so undercooking slightly prevents a mushy final result. Drain and set aside." },
      { step_number: 2, description: "In a large pot over medium heat, melt butter. Add cream cheese and stir until melted and smooth. Gradually add milk and heavy cream, whisking constantly. Add smoked paprika, mustard powder, garlic powder, salt, and pepper." },
      { step_number: 3, description: "Remove from heat and add 2 cups of the shredded cheddar and all the Gruyere, stirring until melted and smooth. Temper the beaten eggs by adding a spoonful of the hot cheese sauce to the eggs, stirring, then pouring the egg mixture back into the pot. This adds richness and helps the mac set up on the smoker." },
      { step_number: 4, description: "Fold the drained macaroni into the cheese sauce until evenly coated. Pour into a large disposable aluminum pan (approximately 9x13 inches). The disposable pan is preferred because it is thinner than cast iron, allowing more smoke to penetrate." },
      { step_number: 5, description: "Place the pan uncovered on the smoker running at 225-275°F. Smoke for 60 minutes, stirring once at the 30-minute mark to distribute smoke flavor throughout." },
      { step_number: 6, description: "After 60 minutes, top with the remaining 1 cup of shredded cheddar and the panko breadcrumbs. Dot with small pieces of butter. Continue smoking uncovered for 25-30 minutes until the top is golden brown and bubbling." },
      { step_number: 7, description: "Remove from the smoker and let rest for 10 minutes. The mac and cheese will thicken as it cools slightly. Serve directly from the pan. Leftovers reheat well with a splash of milk to restore creaminess." },
    ],
  },
];

// ============================================================
// TUTORIALS
// ============================================================

const tutorials = [
  {
    title: "The Complete Guide to Temperature Control on Charcoal Grills",
    slug: "complete-guide-temperature-control-charcoal-grills",
    published_date: "2026-03-22",
    category: "technique",
    difficulty: "intermediate",
    reading_time: 12,
    excerpt: "Master the art of controlling heat on charcoal grills and kamados. Learn vent management, fuel selection, and the science behind fire behavior.",
    content: `<h2>Why Temperature Control Is the Most Important Skill in BBQ</h2>
<p>If you can control temperature, you can cook anything. It is the single skill that separates a pitmaster from someone who just burns meat over hot coals. On a gas grill, temperature control is as simple as turning a knob. On a charcoal grill, it is a craft -- one that requires understanding airflow, fuel behavior, and the physics of combustion. This guide will teach you everything you need to know to hold any temperature from 225°F low-and-slow to 700°F searing heat on any charcoal cooker.</p>

<h2>Understanding the Fire Triangle</h2>
<p>Every fire requires three elements: fuel (charcoal), oxygen (air), and heat (ignition). Remove any one of these, and the fire dies. As a charcoal griller, your primary control lever is oxygen. More air means more combustion, which means more heat. Less air means less combustion and lower temperatures. This is why vent management is the foundation of temperature control.</p>
<p>Your charcoal grill has two sets of vents: bottom (intake) vents and top (exhaust) vents. The bottom vents control how much fresh air feeds the fire. The top vent controls how quickly hot air and smoke exit the cooker. Together, they create a flow of air through the cooking chamber that determines temperature.</p>

<h3>The Golden Rule: Start Small, Adjust Gradually</h3>
<p>The most common mistake beginners make is opening vents wide to heat up quickly, then scrambling to close them when the temperature overshoots. Charcoal has thermal inertia -- like a freight train, it takes time to speed up and time to slow down. If your grill is at 350°F and climbing, closing the vents will not produce an immediate drop. The coals already have momentum, and it may take 15-20 minutes for the temperature to stabilize at a lower point.</p>
<p>Instead, start with vents partially open and let the temperature climb slowly to your target. When you are within 25°F of your goal, begin closing the vents incrementally. Make small adjustments -- 1/4 inch at a time -- and wait 10 minutes to see the effect before adjusting again. Patience is the price of precision.</p>

<h2>Vent Positions for Common Temperatures</h2>
<p>Every grill is different, but these starting positions work as general guidelines for a standard 22-inch kettle grill:</p>
<ul>
<li><strong>225-250°F (Low and Slow):</strong> Bottom vent open 1/4 inch. Top vent open 1/4 to 1/2 way. This is the range for brisket, pork shoulder, and ribs.</li>
<li><strong>275-325°F (Medium-Low):</strong> Bottom vent open 1/2 inch. Top vent open halfway. Good for chicken, turkey, and faster smoked dishes.</li>
<li><strong>350-400°F (Medium):</strong> Bottom vent open 3/4 way. Top vent open 3/4 way. Ideal for roasting and indirect-heat cooking.</li>
<li><strong>450-500°F (Medium-High):</strong> Bottom vent fully open. Top vent 3/4 open. Standard grilling temperature for steaks, burgers, and chops.</li>
<li><strong>600°F+ (Searing):</strong> Both vents fully open. Remove the lid if needed for maximum airflow. Searing zone territory.</li>
</ul>

<h2>The Minion Method: Low and Slow Without Babysitting</h2>
<p>For long cooks at 225-275°F, the Minion Method is the most reliable way to maintain steady temperature for hours without adding fuel. The concept is simple: fill your charcoal chamber with unlit charcoal, then add a small amount of fully-lit coals on top. The lit coals gradually ignite the unlit ones, providing a slow, controlled burn that can last 8-16 hours depending on your cooker and the amount of charcoal.</p>
<p>To use the Minion Method on a kettle grill, fill a charcoal basket or one side of the charcoal grate with unlit briquettes or lump charcoal. Light 10-15 briquettes in a chimney starter until fully ashed over, then place them on top of the unlit charcoal. Add 2-3 wood chunks for smoke flavor. Set your vents for 225-250°F and let the grill stabilize for 20-30 minutes before adding food.</p>

<h2>Dealing with Temperature Spikes</h2>
<p>If your temperature shoots above your target, resist the urge to fully close all vents. Completely shutting off airflow can starve the fire, cause it to smolder, and produce acrid, dirty smoke that ruins your food. Instead, close the bottom vent to about 1/8 inch open and leave the top vent at least 1/4 open. The fire will gradually calm down while still burning cleanly.</p>
<p>If you need a faster temperature drop, open the lid for 5-10 seconds. This seems counterintuitive, but it releases trapped heat from the chamber. The temperature will drop immediately, then begin climbing again as the lid closes and heat rebuilds. This gives you a window to adjust vents before the heat returns.</p>

<h2>Fuel Selection Matters</h2>
<p>Briquettes burn more consistently and predictably than lump charcoal, making them easier for beginners to manage. They maintain a steady temperature with less attention. Lump charcoal burns hotter, responds faster to vent changes, and produces less ash, but it burns less uniformly. For low-and-slow cooking, many pitmasters prefer briquettes for their reliability. For high-heat searing, lump charcoal's higher peak temperature gives it the edge.</p>
<p>Whichever fuel you choose, avoid self-lighting charcoal that contains lighter fluid. The chemical taste persists throughout the cook and contaminates your food. Always use a chimney starter or electric starter for clean ignition.</p>

<h2>Two-Zone Cooking: Your Safety Net</h2>
<p>Always set up your charcoal grill with a two-zone fire: coals on one side, empty on the other. This gives you a hot zone for searing and a cool zone for indirect cooking. If food is cooking too fast, move it to the cool side. If it needs more color, move it over the coals. Two-zone cooking is the single most practical technique for managing temperature at the food level, regardless of what the dome thermometer says.</p>

<h2>Practice Makes Permanent</h2>
<p>Temperature control is a skill, not knowledge. You can read this guide ten times, but you will only internalize it by lighting fires, adjusting vents, and observing what happens. Start with simple cooks -- a spatchcocked chicken at 350°F is an excellent training exercise -- and gradually work toward longer, more demanding sessions. Keep notes on vent positions and temperature results for your specific grill. Within a dozen cooks, you will have an intuitive feel for your cooker that no guide can replace.</p>`,
  },
  {
    title: "How to Choose Your First Smoker: A Buyer's Guide",
    slug: "how-to-choose-your-first-smoker-buyers-guide",
    published_date: "2026-03-16",
    category: "equipment",
    difficulty: "beginner",
    reading_time: 15,
    excerpt: "Overwhelmed by smoker options? This comprehensive guide breaks down every type -- offset, pellet, kamado, kettle, electric -- to help you pick the right one.",
    content: `<h2>The Smoker Market Is Overwhelming -- Let Us Help</h2>
<p>You have decided to start smoking meat. Congratulations -- you are about to embark on one of the most rewarding culinary journeys possible. But you have also walked into one of the most confusing equipment marketplaces in outdoor cooking. Offset smokers, pellet grills, kamado cookers, vertical water smokers, electric smokers, kettle conversions -- each has passionate advocates who insist theirs is the only way. This guide cuts through the noise and helps you match your needs, budget, and experience level to the right smoker.</p>

<h2>Before You Shop: Ask Yourself These Questions</h2>
<p>The "best" smoker does not exist in a vacuum. It depends entirely on your answers to these questions:</p>
<ul>
<li><strong>How hands-on do you want to be?</strong> Do you enjoy tending a fire, or do you want to set a temperature and walk away?</li>
<li><strong>What is your budget?</strong> Smokers range from $100 to $5,000+. More money generally buys better materials and temperature stability, but you can produce excellent BBQ at every price point.</li>
<li><strong>How much space do you have?</strong> A full-size offset needs a dedicated area. A kamado fits on a balcony.</li>
<li><strong>How much are you cooking?</strong> Feeding 4 people or 40?</li>
<li><strong>Do you also want to grill?</strong> Some smokers double as grills; others are smoking-only.</li>
</ul>

<h2>Smoker Types Explained</h2>

<h3>Offset Smokers (Stick Burners)</h3>
<p>The traditional offset smoker has a large horizontal cooking chamber with a smaller firebox attached to one side. You burn wood (or charcoal with wood chunks) in the firebox, and the heat and smoke flow through the cooking chamber and exit via a chimney on the opposite end. This is what you see at legendary Texas BBQ joints.</p>
<p><strong>Pros:</strong> Produces the deepest, most authentic smoke flavor. Uses real wood for fuel. Large cooking capacity. The romantic choice -- tending a stick burner is a deeply satisfying experience.</p>
<p><strong>Cons:</strong> Steep learning curve. Requires constant attention (every 30-45 minutes you need to manage the fire). Cheap offsets have terrible build quality with leaky seams and thin metal. Quality offsets start at $800 and competition-grade models run $2,000-5,000+.</p>
<p><strong>Best for:</strong> Experienced cooks or dedicated beginners willing to invest time in learning fire management. People who value authenticity and flavor depth above convenience.</p>

<h3>Pellet Smokers</h3>
<p>Pellet smokers use an electric auger to feed compressed hardwood pellets into a firepot, with a fan controlling airflow and temperature. You set a target temperature on a digital controller (or smartphone app), and the smoker maintains it automatically. Think of it as a convection oven that burns wood.</p>
<p><strong>Pros:</strong> Easiest smoker to use -- truly set-it-and-forget-it. Consistent temperatures with minimal intervention. Many models include Wi-Fi connectivity for remote monitoring. Wide temperature range (165-500°F) makes them versatile for smoking and grilling.</p>
<p><strong>Cons:</strong> Requires electricity. Produces lighter smoke flavor than offset or charcoal smokers. Ongoing pellet cost ($15-25 per 20-lb bag). Mechanical components (auger, fan, controller) can fail. Cannot achieve the high searing temperatures of charcoal.</p>
<p><strong>Best for:</strong> Beginners, busy cooks, and anyone who wants great results with minimal effort. People who value convenience and consistency.</p>

<h3>Kamado Cookers</h3>
<p>Kamado-style cookers (Kamado Joe, Big Green Egg, etc.) are thick-walled ceramic vessels that burn lump charcoal. The ceramic provides exceptional insulation, which means they hold temperature remarkably well and use very little fuel. They can smoke at 225°F for 16 hours and also sear at 750°F.</p>
<p><strong>Pros:</strong> Incredibly versatile -- smokes, grills, bakes, roasts. Exceptional fuel efficiency. Holds temperature for hours with minimal vent adjustments. Excellent build quality that lasts decades. Compact footprint.</p>
<p><strong>Cons:</strong> Heavy (200-250 lbs). Ceramic can crack if mishandled. Limited cooking area compared to offset or pellet smokers. Learning curve for vent management. Expensive ($1,000-3,000+).</p>
<p><strong>Best for:</strong> Cooks who want one versatile cooker that does everything. People with limited space. Those who appreciate craftsmanship and are willing to learn charcoal management.</p>

<h3>Weber Kettle (The Budget Champion)</h3>
<p>The humble Weber Kettle is not a dedicated smoker, but with proper technique (the Minion Method, snake method, or slow-n-sear insert), it produces excellent smoked meat at a fraction of the cost of dedicated smokers. The 22-inch Original Kettle Premium runs about $165.</p>
<p><strong>Pros:</strong> Affordable. Excellent for grilling AND smoking. Widely available parts and accessories. Huge community with endless resources. Compact and portable.</p>
<p><strong>Cons:</strong> Requires more attention than dedicated smokers. Limited fuel capacity means refueling on long cooks. Smaller cooking area. Not as well-insulated as kamados.</p>
<p><strong>Best for:</strong> Budget-conscious beginners. People who want to learn charcoal fundamentals. Those who need a grill that can also smoke.</p>

<h3>Electric Smokers</h3>
<p>Electric smokers use a heating element and a small tray for wood chips to produce smoke. They plug into a standard outlet and maintain temperature with a thermostat. Models like the Masterbuilt Digital Electric Smoker are popular entry-level options.</p>
<p><strong>Pros:</strong> Extremely easy to use. Very affordable ($150-300). Set temperature and walk away. Allowed in apartments and condos where open-flame cookers are prohibited.</p>
<p><strong>Cons:</strong> Lightest smoke flavor of all options. Cannot achieve high searing temperatures. Results are decent but rarely exceptional. Feels more like an appliance than cooking over fire.</p>
<p><strong>Best for:</strong> Apartment dwellers. Complete beginners who want to try smoking with minimal investment. People who prioritize convenience above all else.</p>

<h2>Our Recommendation for First-Time Buyers</h2>
<p>If you want the best balance of price, versatility, and learning potential, start with a <strong>Weber Kettle 22-inch</strong> ($165) and a <strong>Slow 'N Sear insert</strong> ($100). For $265 total, you get a setup that grills beautifully, smokes competently, and teaches you charcoal fundamentals that transfer to any future cooker. After a year of kettle smoking, you will know exactly what you want in a dedicated smoker.</p>
<p>If budget is not a concern and you want to dive straight into premium equipment, the <strong>Kamado Joe Classic III</strong> is our top pick. It does everything -- smokes, grills, bakes, roasts -- and does it all at an extremely high level. The learning curve is moderate, and the ceramic construction means it will outlast you.</p>
<p>If you want the easiest possible entry into smoking with the least learning curve, a <strong>pellet smoker</strong> like the Traeger Ironwood or Camp Chef Woodwind is the way to go. You will sacrifice some smoke depth compared to charcoal, but the consistency and convenience are unmatched.</p>

<h2>Final Advice</h2>
<p>Do not overthink your first purchase. Any smoker on this list can produce excellent food in the right hands. The most important factor is not the equipment -- it is how often you use it. Buy something within your budget, cook with it every weekend, and you will be producing BBQ that impresses your friends and family within a month. The equipment upgrade path is always available later, once you know what features matter most to your cooking style.</p>`,
  },
  {
    title: "Understanding Wood Types for Smoking: From Hickory to Cherry",
    slug: "understanding-wood-types-smoking-hickory-cherry",
    published_date: "2026-03-10",
    category: "technique",
    difficulty: "beginner",
    reading_time: 10,
    excerpt: "Not all smoke is created equal. Learn which woods pair with which meats, how to avoid bitter over-smoking, and the science behind clean combustion.",
    content: `<h2>Wood Is the Spice Rack of BBQ</h2>
<p>In barbecue, wood smoke is not just a cooking method -- it is a seasoning. Just as a chef selects herbs and spices to complement a dish, a pitmaster selects wood to complement the protein. Hickory with pork. Oak with beef. Cherry with poultry. Apple with ribs. Each wood species produces a distinct flavor profile, and understanding these profiles is essential to producing barbecue that tastes intentional rather than simply smoky.</p>
<p>But wood selection is only half the equation. How you burn it matters just as much. Clean-burning wood produces thin, blue-tinged smoke that imparts delicate flavor. Smoldering, oxygen-starved wood produces thick, white smoke loaded with creosote -- a bitter, acrid compound that coats food with an unpleasant taste and black residue. Mastering wood type AND combustion is what separates good barbecue from great barbecue.</p>

<h2>The Major Smoking Woods</h2>

<h3>Hickory: The All-American Classic</h3>
<p>Hickory is the most popular smoking wood in the United States, and for good reason. It produces a strong, assertive, bacon-like smoke flavor that pairs beautifully with pork in all its forms -- ribs, shoulders, chops, and ham. Hickory is also excellent with beef, adding depth without overpowering the meat's natural flavor.</p>
<p><strong>Intensity:</strong> Strong. Use sparingly or mix with milder woods to avoid bitterness.</p>
<p><strong>Best pairings:</strong> Pork (especially ribs and shoulder), beef brisket, sausages, bacon.</p>
<p><strong>Caution:</strong> Too much hickory smoke can turn bitter. For long cooks (8+ hours), consider using hickory for the first half and switching to a milder fruit wood.</p>

<h3>Oak: The Pitmaster's Foundation</h3>
<p>Oak is the workhorse of Texas barbecue and the default wood at most legendary brisket joints. Post oak, specifically, produces a medium-intensity smoke with a clean, slightly nutty flavor that complements beef without competing with it. It is versatile enough to use with any protein and forgiving enough for beginners.</p>
<p><strong>Intensity:</strong> Medium. The safest choice for beginners.</p>
<p><strong>Best pairings:</strong> Beef brisket (this is THE wood for Central Texas BBQ), beef ribs, lamb, any protein.</p>
<p><strong>Varieties:</strong> Post oak is preferred for BBQ. Red oak is slightly more intense. White oak is milder. All produce excellent results.</p>

<h3>Cherry: The Secret Weapon</h3>
<p>Cherry wood has become the darling of competition BBQ teams, and it is easy to see why. It produces a mild, sweet, slightly fruity smoke that enhances pork and poultry without overpowering them. But cherry's real party trick is its color: it gives smoked meat a gorgeous, deep mahogany hue that makes everything look competition-ready. Many pitmasters mix cherry with a stronger wood (like hickory) to get the best of both worlds -- depth of flavor plus beautiful color.</p>
<p><strong>Intensity:</strong> Mild. Almost impossible to over-smoke with cherry alone.</p>
<p><strong>Best pairings:</strong> Pork ribs, pork shoulder, chicken, turkey, duck, ham.</p>
<p><strong>Pro tip:</strong> A 50/50 blend of cherry and hickory is one of the most popular competition wood combinations for pork ribs.</p>

<h3>Apple: The Gentle Sweetheart</h3>
<p>Apple wood is the mildest of the commonly available smoking woods, producing a subtle, sweet, slightly fruity smoke that never overwhelms. It is the ideal choice for delicate proteins like chicken, turkey, and fish, where a heavy smoke would dominate. Apple also pairs beautifully with pork, though the flavor is more nuanced than what you get from hickory or oak.</p>
<p><strong>Intensity:</strong> Mild to very mild. Ideal for poultry and fish.</p>
<p><strong>Best pairings:</strong> Chicken, turkey, pork (especially ham and loin), fish, cheese.</p>
<p><strong>Note:</strong> Apple's mildness means long cooks benefit from extended smoke exposure. Do not be afraid to smoke with apple for the full duration of a cook.</p>

<h3>Mesquite: Handle with Care</h3>
<p>Mesquite is the most intense smoking wood available. It burns hot and produces a strong, earthy, almost aggressive smoke flavor that can overwhelm food quickly. In its native Texas and the American Southwest, mesquite is used primarily for grilling (direct high heat, short exposure) rather than long smoking sessions. A mesquite-grilled steak is incredible; a mesquite-smoked brisket is often bitter and overpowering.</p>
<p><strong>Intensity:</strong> Very strong. Use only for short-exposure cooking.</p>
<p><strong>Best pairings:</strong> Beef steaks (grilled), fajita meat, vegetables, hearty sausages.</p>
<p><strong>Caution:</strong> Do NOT use mesquite for low-and-slow smoking unless blended heavily (10% mesquite, 90% oak/pecan). The prolonged exposure at low temperatures produces excessively bitter smoke.</p>

<h3>Pecan: Hickory's Refined Cousin</h3>
<p>Pecan is a member of the hickory family and produces a similar but more refined, slightly sweeter smoke flavor. It has the depth of hickory without the risk of bitterness, making it more forgiving for beginners. Pecan is increasingly popular in competition BBQ as a primary smoke wood, particularly in the southeastern United States.</p>
<p><strong>Intensity:</strong> Medium. More forgiving than hickory.</p>
<p><strong>Best pairings:</strong> Pork, poultry, beef, baked goods, cheese. Truly a universal wood.</p>

<h3>Maple: The Underrated Gem</h3>
<p>Maple produces a light, subtly sweet smoke with a delicate flavor that pairs wonderfully with poultry, pork, and vegetables. It is less common than the woods listed above but deserves a spot in any serious pitmaster's wood shed. Sugar maple, in particular, adds a gentle sweetness reminiscent of -- unsurprisingly -- maple syrup.</p>
<p><strong>Intensity:</strong> Mild. Similar to apple.</p>
<p><strong>Best pairings:</strong> Poultry, ham, vegetables, cheese, bacon.</p>

<h2>The Science of Clean Smoke</h2>
<p>Good smoke is thin, almost invisible, and blue-tinged when viewed against a dark background. Bad smoke is thick, white, and billowing. The difference comes down to combustion temperature and oxygen supply.</p>
<p>Wood needs to burn at 570°F or higher to undergo complete combustion, which produces the desirable flavoring compounds (syringol and guaiacol) that give BBQ its characteristic taste. Below this temperature, wood smolders and produces creosote, acrolein, and other unpleasant compounds that taste bitter and coat food with a greasy black residue.</p>
<p>To ensure clean smoke: use seasoned (dried) wood with moisture content below 20%, provide adequate airflow to support combustion, add wood to an established hot fire rather than trying to ignite cold wood, and never smother your fire by adding too much wood at once. Two or three fist-sized chunks on a hot coal bed produce better smoke than a dozen chunks piled into a cold firebox.</p>

<h2>Quick Reference Pairing Chart</h2>
<ul>
<li><strong>Beef brisket:</strong> Oak (primary), hickory, pecan, mesquite (grilling only)</li>
<li><strong>Pork ribs:</strong> Cherry + hickory blend, apple, pecan</li>
<li><strong>Pork shoulder:</strong> Hickory, cherry, apple, oak</li>
<li><strong>Chicken:</strong> Apple, cherry, maple, pecan</li>
<li><strong>Turkey:</strong> Apple, cherry, maple</li>
<li><strong>Fish/Seafood:</strong> Alder, apple, cherry (very light smoke)</li>
<li><strong>Cheese:</strong> Apple, cherry, maple (cold smoke only)</li>
<li><strong>Vegetables:</strong> Mesquite (grilled), cherry, apple</li>
</ul>

<h2>Start Simple, Experiment Often</h2>
<p>If you are just beginning your smoking journey, buy a bag of post oak chunks and use it for everything. Oak is the most forgiving and universally compatible wood available. Once you are comfortable with your smoker and your technique, start experimenting with fruit woods and blends. Keep notes on what you use and what you taste -- your palate will develop over time, and you will eventually develop personal preferences that no guide can dictate.</p>`,
  },
];

// ============================================================
// BLOG POSTS
// ============================================================

const blogPosts = [
  {
    title: "BBQ Season 2026: Top Trends and What to Watch",
    slug: "bbq-season-2026-top-trends",
    published_date: "2026-03-25",
    category: "trends",
    featured: true,
    reading_time: 7,
    excerpt: "From AI-powered temperature controllers to the rise of whole-animal butchery classes, here are the trends shaping the 2026 BBQ season.",
    content: `<h2>The State of Outdoor Cooking in 2026</h2>
<p>Every year, the barbecue world evolves. New technologies emerge, old techniques are rediscovered, and the community grows in ways nobody predicted. As we enter the 2026 grilling season, several trends are reshaping how Americans (and the world) think about outdoor cooking. Some are technological. Some are cultural. All of them point to a future where barbecue is more accessible, more creative, and more connected than ever.</p>

<h2>1. AI-Assisted Temperature Control Goes Mainstream</h2>
<p>The biggest hardware trend of 2026 is the integration of machine learning into temperature controllers. Companies like FireBoard, ThermoWorks, and even Weber are shipping controllers that do not just hold a set temperature -- they learn your cooker's behavior over time and predict adjustments before they are needed. FireBoard's new AI Drive uses historical data from thousands of cooks to optimize fan speed, anticipate the stall in brisket cooks, and even suggest when to wrap based on bark development data from the probe sensors.</p>
<p>This is not gimmicky technology. In our testing, the AI-driven controllers reduced temperature variance by 40% compared to traditional PID controllers, and they adapted to wind, ambient temperature changes, and fuel depletion without any user intervention. For pellet smoker owners, Traeger's updated WiFIRE app now includes a "Smart Cook" mode that adjusts pellet feed rate and fan speed in real-time based on food probe data. The future of set-it-and-forget-it just got even more hands-off.</p>

<h2>2. The Whole-Animal Movement</h2>
<p>Nose-to-tail cooking has been a restaurant trend for years, but in 2026, it is hitting the backyard. Whole-animal butchery classes are selling out at cooking schools across the country, and more home cooks are buying whole or half animals directly from local farms. The economics are compelling: a whole hog from a local farm runs $3-5 per pound hanging weight, compared to $8-12 per pound for individual cuts at the butcher shop.</p>
<p>This trend is driving interest in lesser-known cuts that are perfectly suited to barbecue: beef cheeks, pork jowl, lamb neck, and oxtail. These collagen-rich cuts benefit enormously from low-and-slow smoking, and they deliver flavor that premium cuts simply cannot match. Expect to see more content creators and competition teams showcasing these underdog cuts throughout the season.</p>

<h2>3. Portable Smoking Goes Everywhere</h2>
<p>The explosion of compact, portable smokers is one of the most exciting developments in recent years. The Weber Smokey Mountain 14-inch, the Oklahoma Joe Rambler, and the new Masterbuilt Portable Charcoal Smoker all weigh under 40 pounds and fit in a car trunk. Tailgating, camping, and beach barbecue have leveled up dramatically. We have seen pellet smoker manufacturers respond with ultra-portable models as well -- the Traeger Ranger and Green Mountain Grills Trek are genuinely backpack-friendly units that produce real smoked food in the wilderness.</p>

<h2>4. Asian BBQ Techniques Go Global</h2>
<p>Korean BBQ, Japanese yakitori, and Thai street-grill techniques are no longer niche interests. In 2026, we are seeing mainstream crossover: konro grills (Japanese charcoal grills designed for binchotan charcoal) are appearing on patios across America, Korean-style short rib recipes are dominating social media, and satay skewers are becoming a grilling staple alongside burgers and hot dogs. The flavor profiles -- soy, gochujang, miso, fish sauce -- are expanding the American BBQ palate in exciting ways.</p>

<h2>5. Sustainability Becomes Non-Negotiable</h2>
<p>Eco-conscious grilling is no longer a niche concern. Charcoal brands are increasingly touting sustainable forestry certifications, and brands like Jealous Devil (FSC-certified) and FOGO (Rainforest Alliance) are growing rapidly as consumers vote with their wallets. Lump charcoal made from invasive species (like Australian eucalyptus thinnings) is emerging as a category, turning an environmental problem into premium fuel.</p>
<p>On the hardware side, insulated cookers like kamados and double-walled pellet smokers are gaining market share partly because of their fuel efficiency. A Kamado Joe Classic III uses roughly 4 pounds of charcoal for a 12-hour cook -- less than half what an uninsulated offset consumes. Efficiency is good for the environment and your wallet.</p>

<h2>6. Live-Fire Cooking Enters the Home Kitchen</h2>
<p>Indoor live-fire cooking, once limited to high-end restaurants, is becoming accessible to home cooks through products like the Beefer (a 1,500°F overhead infrared searing unit), countertop charcoal grills with integrated ventilation, and wood-fired ovens small enough for a kitchen counter. The desire to cook with real fire, real smoke, and real flame is not going away -- it is moving indoors for year-round availability.</p>

<h2>What We Are Most Excited About</h2>
<p>If we had to pick the single most impactful trend of 2026, it is the democratization of knowledge. YouTube channels, Instagram accounts, podcasts, and communities like r/smoking and the BBQ Brethren forums have created an unprecedented wealth of free, high-quality BBQ education. A beginner in 2026 has access to more expert guidance in a single weekend than previous generations accumulated over years of trial and error. The bar for entry has never been lower, and the ceiling for excellence has never been higher.</p>
<p>Fire up your grills. It is going to be a great season.</p>`,
  },
  {
    title: "We Tested 10 Charcoal Brands — Here's What We Found",
    slug: "tested-10-charcoal-brands-results",
    published_date: "2026-03-20",
    category: "tips",
    featured: false,
    reading_time: 9,
    excerpt: "We burned through 200 pounds of charcoal in controlled tests measuring heat output, burn time, ash production, and flavor. The results surprised us.",
    content: `<h2>The Test Nobody Else Is Running</h2>
<p>Charcoal is the foundation of every charcoal cook, yet most grillers spend more time agonizing over rub recipes than the fuel beneath their food. We decided to change that. Over three weeks, we tested 10 of the most popular lump charcoal brands in rigorous, controlled conditions to answer the questions that matter: Which burns hottest? Which lasts longest? Which produces the least ash? And does any of it actually affect the flavor of the food?</p>

<h2>Our Testing Methodology</h2>
<p>We used identical Weber Kettle 22-inch grills for all tests, ensuring consistent airflow and cooking geometry. Each brand was tested with exactly 5 pounds of charcoal, lit in a standard Weber chimney starter for exactly 15 minutes. We measured:</p>
<ul>
<li><strong>Time to grilling temperature (450°F at grate level):</strong> How quickly the charcoal was ready to cook.</li>
<li><strong>Peak temperature:</strong> Maximum grate temperature with vents fully open.</li>
<li><strong>Burn duration above 400°F:</strong> How long it maintained grilling heat.</li>
<li><strong>Total burn time:</strong> Time from ignition to complete ash.</li>
<li><strong>Ash production:</strong> Weight of ash as a percentage of starting weight.</li>
<li><strong>Piece size consistency:</strong> Percentage of pieces larger than a golf ball.</li>
</ul>
<p>We ran each brand through the test three times and averaged the results to account for natural variation. We also grilled identical chicken thighs over each brand for a flavor comparison, evaluated by our four-person tasting panel.</p>

<h2>The Contenders</h2>
<p>We tested the following brands, all purchased at retail to ensure we got the same product any consumer would receive:</p>
<ul>
<li>Jealous Devil All-Natural Hardwood</li>
<li>FOGO Premium Hardwood</li>
<li>Kamado Joe Big Block</li>
<li>Royal Oak Lump Charcoal</li>
<li>Cowboy Brand Hardwood Lump</li>
<li>B&B Oak Lump Charcoal</li>
<li>Rockwood All-Natural Hardwood</li>
<li>Harder Charcoal (Australian)</li>
<li>Jealous Devil XL (restaurant grade)</li>
<li>Weber Hardwood Lump</li>
</ul>

<h2>The Results: Performance Rankings</h2>

<h3>Longest Burn Time</h3>
<p>Jealous Devil dominated this category, maintaining temperatures above 400°F for an average of 2 hours and 48 minutes -- nearly a full hour longer than the average of all brands tested. The extreme density of the Quebracho Blanco hardwood is the key factor. FOGO Premium came in second at 2 hours and 22 minutes, followed by Kamado Joe Big Block at 2 hours and 15 minutes.</p>
<p>At the bottom, Cowboy Brand burned through its 5-pound load in just 1 hour and 18 minutes above 400°F. The smaller, inconsistent piece sizes meant faster combustion and more ash clogging the airflow.</p>

<h3>Highest Peak Temperature</h3>
<p>Harder Charcoal from Australia reached the highest peak grate temperature at 782°F, edging out Jealous Devil at 725°F and FOGO at 710°F. Harder's eucalyptus-based charcoal burns extremely hot but does not last as long as the South American hardwoods. For searing applications, all three are more than adequate.</p>

<h3>Lowest Ash Production</h3>
<p>Jealous Devil again led the pack at just 2.8% ash residue by weight. FOGO was close behind at 3.4%, and Kamado Joe Big Block produced 4.1%. The worst performer was Royal Oak at 12.3% -- meaning roughly one-eighth of what you buy ends up as ash rather than heat. High ash production clogs vents, reduces airflow, and destabilizes temperature on long cooks.</p>

<h3>Best Piece Size Consistency</h3>
<p>Jealous Devil and Kamado Joe Big Block tied in this category, with over 85% of pieces being larger than a golf ball. FOGO was close at 80%. Cowboy Brand was the worst at only 45% large pieces, with excessive dust and small fragments that burn quickly and unevenly.</p>

<h2>The Flavor Test</h2>
<p>Here is where things got interesting. Our blind tasting panel evaluated chicken thighs grilled identically over each brand, rating smoke flavor, off-notes, and overall preference. The differences were subtle but real:</p>
<p>B&B Oak produced the cleanest, most neutral flavor -- the oak lets the chicken speak for itself. Jealous Devil was similarly clean with a very faint sweetness. FOGO added a slightly more assertive smokiness that our panel found pleasant. Cowboy Brand received the lowest marks, with two panelists noting a faint chemical or "off" aftertaste -- likely from inconsistent wood sourcing or residual bark.</p>
<p>The honest truth? For most backyard cooking, the flavor differences between premium charcoal brands are minor. Where the brands differ dramatically is in performance: burn time, heat output, ash production, and consistency. These factors directly affect your cooking experience and the ease of temperature management.</p>

<h2>Our Top Picks</h2>
<p><strong>Best Overall: Jealous Devil All-Natural.</strong> It won or placed in every category. The price premium is justified by performance that no other brand matches.</p>
<p><strong>Best Value: B&B Oak Lump.</strong> Solid performance across the board at a significantly lower price point. The oak flavor is clean and versatile. Widely available at hardware stores.</p>
<p><strong>Best for Searing: Harder Charcoal.</strong> If you need maximum heat for steakhouse-style searing, nothing burns hotter. Limited availability in the US, but worth seeking out.</p>
<p><strong>Avoid: Cowboy Brand.</strong> Inconsistent piece sizes, high ash, short burn time, and questionable flavor. There is no reason to buy this when better options exist at similar prices.</p>

<h2>The Bottom Line</h2>
<p>Your charcoal matters more than you think. The difference between the best and worst brands we tested was a 90-minute gap in burn time, a 60°F gap in peak temperature, and a 10% gap in ash production. Those differences translate directly into your cooking experience. Invest in quality fuel, and every cook gets easier, more consistent, and more enjoyable.</p>`,
  },
  {
    title: "Behind the Scenes: How We Review Every Product",
    slug: "behind-the-scenes-how-we-review-products",
    published_date: "2026-03-12",
    category: "culture",
    featured: false,
    reading_time: 6,
    excerpt: "Transparency matters. Here is exactly how we test, score, and write every product review on BBQ Experience -- no shortcuts, no paid placements.",
    content: `<h2>Our Promise: Honest Reviews, Always</h2>
<p>When we launched BBQ Experience, we made a commitment that every product review would be based on genuine, hands-on testing by people who actually cook over fire every week. No desk reviews. No sponsored content disguised as editorial. No inflated scores to keep advertisers happy. If we review it, we have used it -- extensively -- and our opinions are our own. This article explains exactly how that process works.</p>

<h2>How We Select Products</h2>
<p>We review products that our readers actually want to buy. Selection is driven by three factors: reader requests (we track what people ask about in comments and emails), market relevance (bestselling products that many people will encounter), and innovation (new products that introduce genuinely useful features). We do not accept payment for reviews, and manufacturers cannot buy a review or influence its outcome. Period.</p>
<p>When possible, we purchase products at retail with our own funds. In some cases, manufacturers provide review units, which we always disclose. The editorial process is identical regardless of how we acquired the product -- the review team does not know (or care) whether a product was purchased or provided.</p>

<h2>The Testing Process</h2>
<p>Every product undergoes a minimum testing period before we write a single word:</p>
<ul>
<li><strong>Grills and Smokers:</strong> 6-8 weeks of regular use, minimum 12 cooking sessions covering different techniques (grilling, smoking, roasting, searing).</li>
<li><strong>Thermometers and Electronics:</strong> 4-6 weeks, tested against NIST-traceable reference instruments for accuracy verification.</li>
<li><strong>Accessories:</strong> 4 weeks of use in real cooking scenarios, not laboratory conditions.</li>
<li><strong>Consumables (charcoal, pellets, wood):</strong> Multiple controlled burn tests plus real-world cooking evaluation.</li>
</ul>
<p>During testing, we document everything: temperature data, cook times, photos at each stage, notes on usability, and observations about build quality and durability. We intentionally stress-test products by using them in rain, cold, and wind -- because real grillers do not cook only on perfect days.</p>

<h2>How We Score</h2>
<p>Each review includes four sub-scores and one overall score, all on a 0-10 scale:</p>
<ul>
<li><strong>Build Quality (weight: 25%):</strong> Materials, construction, fit and finish, durability indicators, warranty coverage.</li>
<li><strong>Performance (weight: 35%):</strong> How well does it do what it claims? For grills: heat distribution, temperature range, smoke production. For thermometers: speed, accuracy. For charcoal: burn time, heat output, ash production.</li>
<li><strong>Value (weight: 20%):</strong> Performance and quality relative to price. An $800 grill that performs like a $2,000 unit scores higher here than a $2,000 grill that performs like a $2,000 unit.</li>
<li><strong>Ease of Use (weight: 20%):</strong> Assembly, learning curve, daily operation, cleaning, maintenance.</li>
</ul>
<p>The overall score is a weighted average of these four components, not a simple arithmetic mean. Performance carries the most weight because, ultimately, how well a product works matters more than anything else.</p>
<p>We calibrate our scale so that 5.0 represents an average product, 7.0 represents a good product worth buying, 8.0 represents an excellent product, and 9.0+ is reserved for exceptional products that set the standard in their category. We have never given a 10.0 overall score, and we may never -- perfection is a direction, not a destination.</p>

<h2>The Writing Process</h2>
<p>After testing is complete, the reviewer writes the editorial content from their notes and experience. The draft is reviewed by at least one other team member who has also used the product, ensuring the assessment is fair and comprehensive. We specifically look for: claims that are not supported by our testing data, tone that feels promotional rather than evaluative, and missing information that readers would need to make a purchase decision.</p>
<p>Every review includes specific pros and cons, a verdict sentence, and real-world context about who should (and should not) buy the product. We believe a good review helps you decide, whether the answer is "buy it" or "skip it."</p>

<h2>Affiliate Links and Revenue</h2>
<p>BBQ Experience uses affiliate links in product reviews. When you click a link and make a purchase, we earn a small commission at no additional cost to you. This revenue helps fund our testing program and keeps the site running. However -- and this is critical -- affiliate relationships never influence our scores, recommendations, or editorial content. We have published negative reviews of products from brands whose affiliate programs we participate in, and we will continue to do so whenever our testing warrants it.</p>

<h2>Hold Us Accountable</h2>
<p>If you disagree with a review, tell us. If you find an error, point it out. If you think we missed something important, let us know. Our comment sections are open, our email is monitored, and we regularly update reviews based on reader feedback, long-term durability observations, and manufacturer changes. We are not perfect, but we are committed to being honest. That is the only promise that matters.</p>`,
  },
];

// ============================================================
// MAIN EXECUTION
// ============================================================

async function createItems(type, endpoint, items) {
  const results = [];
  for (const item of items) {
    try {
      // Rimuovi campi interni che iniziano con _
      const data = {};
      for (const [key, value] of Object.entries(item)) {
        if (!key.startsWith("_")) {
          data[key] = value;
        }
      }
      const res = await apiPost(endpoint, data);
      const id = res.data?.id || res.data?.documentId;
      log(true, type, `${item.title || item.name} (ID: ${id})`);
      results.push({ ...item, _id: res.data?.id, _documentId: res.data?.documentId });
    } catch (err) {
      log(false, type, `${item.title || item.name}: ${err.message}`);
      results.push({ ...item, _error: true });
    }
  }
  return results;
}

async function main() {
  console.log("=== BBQ Experience Content Seeding ===\n");

  // 1. Creo i prodotti per primi
  console.log("--- Products ---");
  const createdProducts = await createItems("Product", "products", products);

  // Mappa slug -> documentId per i link nelle review
  const productMap = {};
  for (const p of createdProducts) {
    if (p._documentId) {
      productMap[p.slug] = p._documentId;
    }
  }

  // 2. Creo le review, collegando il prodotto
  console.log("\n--- Reviews ---");
  const reviewData = reviews.map((r) => {
    const copy = { ...r };
    const productDocId = productMap[r._productSlug];
    if (productDocId) {
      copy.product = productDocId;
    }
    delete copy._productSlug;
    return copy;
  });
  await createItems("Review", "reviews", reviewData);

  // 3. Ricette
  console.log("\n--- Recipes ---");
  await createItems("Recipe", "recipes", recipes);

  // 4. Tutorial
  console.log("\n--- Tutorials ---");
  await createItems("Tutorial", "tutorials", tutorials);

  // 5. Blog Posts
  console.log("\n--- Blog Posts ---");
  await createItems("BlogPost", "blog-posts", blogPosts);

  console.log("\n=== Seeding Complete ===");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
