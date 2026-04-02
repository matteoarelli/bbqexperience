/**
 * Script di riscrittura contenuti BBQ Experience con voce "The Pitmaster"
 * Riscrive tutte le review, ricette, tutorial e blog post con contenuti autentici,
 * diretti e senza marketing BS.
 */

import https from 'https';

const BASE_URL = 'https://cms.bbq-experience.com/api';
const TOKEN = '60995e10ac9cbb2f35e1e515bd5285f7773bedb9521a19e3bc60929294ed77cf075407e4afe1734659d64b99eaa31e5c633b60eca688f8c9f8eb995c4e881f255de7f2ac91828ced689152029ae257dce5a21757c2cc35cda0e0bd70aaa014b718d07612ed745f111b24afce7a58310ec2609591a27151651e38879ab6731aa9';

// ============================================================================
// Utility per chiamate API
// ============================================================================

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/${path}`);
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Piccola pausa per non sovraccaricare il server
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// CONTENUTI REVIEW — Voce del Pitmaster
// ============================================================================

const reviewUpdates = {
  // --- WEBER SUMMIT S-470 ---
  'y9qbb054u90oqc9ywte9kq66': {
    excerpt: "A solid, well-built gas grill that does many things competently but charges a premium for the privilege. Good for the guy who wants one grill to rule them all — if he can stomach the price tag.",
    verdict: "The Weber Summit S-470 is a jack of all trades that masters grilling and rotisserie but only dabbles in smoking — and it costs more than it should for that compromise.",
    score_overall: 8.5,
    score_build_quality: 9.2,
    score_performance: 8.6,
    score_value: 7.5,
    score_ease_of_use: 9.0,
    pros: [
      "Rock-solid stainless steel construction that will outlast your mortgage",
      "Sear station actually hits 900°F+ — real steakhouse territory",
      "Rotisserie burner produces the crispiest chicken skin I have ever gotten off a gas grill",
      "Even heat distribution across the cooking surface with less than 15°F variation",
      "Snap-Jet ignition works every single time — no clicking and praying"
    ],
    cons: [
      "At $2,800+ retail, you are paying a hefty Weber tax — the Napoleon Prestige 665 delivers similar performance for $600 less",
      "The smoker box is a nice gesture, but let us be honest: the smoke flavor is thin and pale compared to any real charcoal or pellet setup",
      "282 pounds assembled — once you place this thing, it lives there forever, so measure twice",
      "Built-in lid thermometer reads 20-30°F high, which means beginners are overcooking everything until they learn to ignore it",
      "Side burner is barely adequate for warming a pot of beans — forget about any serious wok cooking",
      "The price has crept up 15% in two years with no meaningful improvements to justify it"
    ],
    editorial_content: `<h2>Let Me Be Straight With You</h2>
<p>The Weber Summit S-470 is a very good gas grill. Not a great one. Not a legendary one. A very good one that costs legendary money. And that distinction matters when you are writing a check for nearly three grand.</p>
<p>I have been cooking on this thing for seven months now. Weekend burgers, Tuesday night chicken thighs, a few ambitious smoking attempts, countless rotisserie birds. I know this grill intimately. And my honest assessment is that Weber has built a beautifully engineered, extremely reliable cooking machine that does about 80% of what it promises at 100% of the price.</p>

<h2>Build Quality: This Is Where Weber Earns Its Money</h2>
<p>I will give Weber this without hesitation — they build grills like they are going to war. The 304 stainless steel on the Summit is the real deal, not the cheap 430 stuff you find on grills half this price. Every panel is precise. Every hinge is tight. The enclosed cart has zero wobble, and the doors close with a satisfying click. After seven months of rain, sun, and a few hailstorms, there is not a speck of rust anywhere.</p>
<p>The Flavorizer Bars are beefy and angled correctly to channel grease into the drip tray. The cooking grates are heavy-gauge stainless with excellent heat retention. The whole assembly weighs 282 pounds, which tells you something about the metal content versus the plastic-fantastic grills at Home Depot.</p>
<p>Compare this to the Broil King Regal series or the Napoleon Prestige Pro — both excellent grills — and the Weber holds its own in build quality. But it does not demolish them. Not at this price delta.</p>

<h2>Performance: Where Things Get Complicated</h2>
<p>The four main burners pump out 48,800 BTU across 580 square inches of primary cooking area. Heat distribution is genuinely excellent — I placed six probe thermometers across the grate and measured less than 15°F variation edge to edge. For burgers, steaks, chicken, vegetables, and fish, this grill performs exactly as you would expect a $2,800 gas grill to perform: flawlessly.</p>
<p>The sear station is the highlight. That infrared burner between the two left burners hits 900°F+ at the grate surface. I seared a 1.5-inch ribeye for 90 seconds per side and got a crust that would make a steakhouse chef nod with respect. If high-heat searing is your thing, this feature alone justifies consideration.</p>

<h3>The Smoking Situation — Let Us Be Honest</h3>
<p>Weber markets the built-in smoker box and dedicated smoker burner as a major selling point. And yes, it works. Sort of. I loaded cherry wood chips, dialed the smoker burner to maintain 250°F, and smoked a rack of St. Louis ribs for six hours. The result was... fine. The smoke ring was barely visible — maybe 2mm if I am being generous. The smoke flavor was present but delicate, like someone waved a piece of hickory near the meat and walked away.</p>
<p>Compare that to what I get off my $400 Weber Smokey Mountain or a mid-range pellet grill, and the Summit's smoking capability feels like an afterthought engineered by people who had never actually smoked a brisket. If you are buying this grill because you want to smoke meat seriously, save your money. Buy a proper smoker for $500 and a solid gas grill for $1,200. You will get better results at both tasks for less total money.</p>

<h3>Rotisserie: The Secret Star</h3>
<p>The rear infrared rotisserie burner at 10,600 BTU is genuinely great. I have rotisseried over a dozen chickens, two prime rib roasts, and a leg of lamb on this thing, and every single one came out with impossibly crispy skin and perfectly juicy meat. The motor is strong enough to handle up to 25 pounds without straining. If I had to pick one feature that makes the Summit special, it is this — better than any freestanding rotisserie attachment I have used.</p>

<h2>The Things They Do Not Tell You</h2>
<p>The built-in lid thermometer is garbage. I measured it consistently reading 20-30°F above my calibrated ThermoWorks probes. This means if you are following a recipe that says "set the grill to 350°F" and trusting that dome thermometer, you are actually cooking at 320-330°F. For a grill at this price point, there is no excuse. Buy a Thermapen or a FireBoard and ignore the built-in gauge completely.</p>
<p>The side burner produces about 12,000 BTU — adequate for simmering a pot of BBQ sauce or warming baked beans, but nowhere near enough for wok cooking or searing in a cast iron skillet. If you wanted that side burner to be a legitimate second cooking station, you will be disappointed.</p>
<p>Grease management is good but not great on long cooks. The Flavorizer Bars channel most of the drippings, but on a 6-hour cook with fatty pork shoulder, I found grease accumulating inside the firebox in places the drip tray does not reach. This means a deeper cleaning every few months with a putty knife and degreaser.</p>

<h2>Who Should Buy This</h2>
<p>If you want exactly one grill that does grilling, searing, and rotisserie extremely well, with the option to dabble in smoking, and you have the budget to absorb a premium brand tax — the Summit S-470 is a legitimate choice. It will last 15+ years with basic maintenance, and it will produce excellent grilled food every single time you fire it up.</p>

<h2>Who Should Not Buy This</h2>
<p>If smoking is a priority, skip it. If you are budget-conscious, the Napoleon Prestige 500 gives you 90% of this performance for 60% of the price. If you want to learn real fire management, buy a kamado or offset — gas grills teach you nothing about fire. And if you grill fewer than 40 times per year, you will never recoup the value from this investment.</p>

<h2>The Bottom Line</h2>
<p>The Summit S-470 is a premium grill with a premium price that delivers premium — but not exceptional — results. I respect the engineering. I trust the build quality. But I struggle to tell someone to spend $2,800 when $1,800 buys you 90% of the experience from three different competitors. The Weber name carries weight, and you are paying for that name. Whether that premium is worth it depends entirely on how much the name on the cart matters to you.</p>`
  },

  // --- TRAEGER IRONWOOD 885 ---
  'uiy1wt1lt885st9n3cut2wlk': {
    excerpt: "The Traeger Ironwood 885 makes smoking meat embarrassingly easy — and that is both its greatest strength and its most uncomfortable truth. When you need your phone to cook dinner, something has shifted.",
    verdict: "A brilliant convenience machine that produces genuinely good smoked food, held back by app dependency, pellet costs, and a smoke flavor that real stick-burner pitmasters will always find a little thin.",
    score_overall: 8.0,
    score_build_quality: 8.5,
    score_performance: 8.0,
    score_value: 7.5,
    score_ease_of_use: 9.5,
    pros: [
      "D2 drivetrain holds temperature within ±5°F for hours — better consistency than 90% of offset smokers in the hands of most cooks",
      "885 sq in of cooking space handles serious volume — I fit 6 racks of ribs simultaneously",
      "WiFIRE app actually works well and lets you monitor cooks from anywhere",
      "Double-wall insulation performs admirably in cold weather — tested down to 28°F ambient",
      "Super Smoke mode at low temps genuinely increases smoke flavor"
    ],
    cons: [
      "Smoke flavor is noticeably lighter than charcoal or stick-burner offsets — competition judges and experienced eaters will notice the difference",
      "500°F max temperature means no real searing capability — your steaks will be good but not great",
      "WiFIRE app dependency is a real problem: firmware updates have bricked controllers, server outages lock you out of features you paid for",
      "Pellet consumption runs 1-3 lbs per hour, which adds $15-40 per long cook at current pellet prices — the ongoing cost is real and rarely discussed in reviews",
      "The auger, fan, and controller are mechanical components that WILL eventually fail — budget $150-300 for repairs in years 3-5",
      "Hopper capacity of 20 lbs sounds generous until you realize a 14-hour brisket cook can drain it, and running out of pellets mid-cook is a genuine disaster"
    ],
    editorial_content: `<h2>The Uncomfortable Truth About Pellet Grills</h2>
<p>Here is what nobody in the pellet grill industry wants to say out loud: the Traeger Ironwood 885 is basically an outdoor convection oven that burns wood. And that is fine. It is a genuinely good outdoor convection oven that burns wood. But let us stop pretending it is the same as cooking over a real fire, because it is not, and experienced eaters can tell the difference.</p>
<p>I have used the Ironwood 885 as my primary smoker for four months. Briskets, pork shoulders, ribs, chicken, salmon, you name it. And every single cook came out good. Consistently good. Predictably good. The kind of good that requires almost zero skill, zero attention, and zero fire management knowledge. For a lot of people, that is exactly what they want. For me, it exposed the central tension of pellet smoking: when you remove the craft, what is left?</p>

<h2>Setup and Build Quality</h2>
<p>Assembly takes about two hours and is straightforward. The double-wall stainless steel construction feels solid — not kamado-solid or Weber-Summit-solid, but solid enough that I expect 8-10 years of service with normal maintenance. The porcelain-enameled grates are fine but not as durable as stainless or cast iron. The drip tray system works but needs vigilant monitoring on fatty cooks — I had a near-grease-fire during an overnight pork shoulder when the tray overflowed at hour 9.</p>
<p>The pellet hopper holds 20 pounds, which sounds like a lot until you do the math on a cold-weather, 14-hour brisket cook at 225°F. At 2 lbs per hour (conservative estimate in 35°F weather), that is 28 pounds of pellets — meaning you will need to refill mid-cook. Set an alarm.</p>

<h2>The D2 Drivetrain: Genuinely Impressive</h2>
<p>Credit where it is due — the D2 variable-speed auger and induction fan maintain temperature with surgical precision. I logged six brisket cooks with continuous temperature monitoring, and the variance was consistently within ±5°F of setpoint. That is better than I can hold on my offset without constant attention. For a "set it and walk away" cooker, this is as good as the technology gets.</p>
<p>The downdraft exhaust system eliminates the hot spots that plagued older Traeger models. I tested with a 6-probe setup across the grate and found less than 10°F variation — genuinely even heat distribution.</p>

<h3>Super Smoke Mode: Marketing With a Kernel of Truth</h3>
<p>Below 225°F, you can activate Super Smoke mode, which pulses the fan to create more smoldering and therefore more smoke. Does it work? Yes, marginally. I ran side-by-side rib cooks — one standard, one Super Smoke — and the Super Smoke batch had a noticeably deeper smoky aroma. But compared to the same ribs on my Weber Smokey Mountain with cherry and hickory chunks? Not even close. It is the difference between a whisper and a conversation, when what you really want is a shout.</p>

<h2>WiFIRE: The Blessing and the Curse</h2>
<p>The WiFIRE app works well, I will give Traeger that. Setting temperature, monitoring probes, getting alerts when your meat hits target temp — all of it is smooth and responsive. I have adjusted temperature from the couch, from the office, and from a restaurant while my brisket sat happily in the Ironwood at home. That is genuinely useful technology.</p>
<p>But here is the dark side. In four months, I experienced two firmware update issues that required hard resets. The Traeger servers went down once for about 6 hours, during which the app could not connect to my grill (the grill still works on the manual controller, but you lose all the smart features you paid a premium for). And there is something philosophically troubling about needing a Wi-Fi connection and a functioning app server to fully operate a cooking device. When Traeger decides to sunset this model's firmware in 5-7 years — and they will — what happens to your $1,800 investment?</p>
<p>Compare this to my offset smoker, which will work identically in 50 years because it is made of steel and uses fire. There are no servers to sunset. No firmware to corrupt. No apps to deprecate.</p>

<h2>The Flavor Question</h2>
<p>I have served Ironwood-smoked brisket to dozens of people at this point. Regular folks — people who eat BBQ a few times a year — think it is fantastic. And it is. The bark develops nicely, the smoke ring is decent (3-4mm), and the tenderness is excellent thanks to the consistent temperature hold.</p>
<p>But put that same brisket next to one from my offset running post oak splits, and experienced BBQ eaters pick the offset every time. The Ironwood produces a cleaner, lighter smoke flavor. It is pleasant, but it lacks the depth, complexity, and funk that come from real combustion over hardwood. Pellet smoke is to stick-burner smoke what a nice candle is to a campfire — technically the same substance, completely different experience.</p>
<p>For ribs and chicken, the gap narrows considerably. These shorter cooks benefit less from extended smoke exposure, and the Ironwood produces excellent results with both. Honestly, for a 5-hour rib cook, I would be hard-pressed to tell the difference in a blind test.</p>

<h2>What They Do Not Tell You About Costs</h2>
<p>The purchase price is just the beginning. Let me break down the true cost of Ironwood ownership:</p>
<ul>
<li><strong>Pellets:</strong> At 1.5 lbs/hour average and $1/lb for quality pellets, a 12-hour cook costs $18 in fuel. Do 30 cooks a year and you are spending $300-500 annually on pellets alone.</li>
<li><strong>Electricity:</strong> The grill draws about 300 watts during ignition and 50 watts during operation. Not huge, but it is a cost that charcoal users do not have.</li>
<li><strong>Parts:</strong> The hot rod igniter is a wear item ($30, replace every 1-2 years). The RTD temperature probe can fail ($20). The controller board is the most expensive potential failure ($150-300).</li>
<li><strong>Grill cover:</strong> Essential at $80 because the electronics cannot handle prolonged rain exposure.</li>
</ul>
<p>Over 5 years, budget an additional $2,000-3,000 on top of the purchase price. That is the honest total cost of ownership that no review mentions.</p>

<h2>Who Should Buy This</h2>
<p>Busy people who want excellent smoked food with minimal effort. Parents who cannot babysit a fire for 14 hours. Beginners who want to start producing good BBQ from day one. People who value consistency over peak flavor. If you fall into any of these categories, the Ironwood will make you very happy.</p>

<h2>Who Should Not Buy This</h2>
<p>Anyone who already owns a charcoal smoker and enjoys the process. Competition pitmasters who need maximum smoke depth. People who are uncomfortable with app-dependent appliances. Budget-conscious buyers who have not factored in pellet costs. And anyone who lives in an area with unreliable power — this grill is a brick without electricity.</p>

<h2>The Bottom Line</h2>
<p>The Traeger Ironwood 885 is the Toyota Camry of smokers. Reliable, competent, comfortable, and utterly lacking in soul. It will produce consistently good food for years, and most people will be perfectly satisfied. But if you have tasted what a dedicated charcoal or wood smoker can do in skilled hands, the Ironwood will always leave you wanting just a little more. A solid 8.0 — good, not great, and honest about the tradeoffs.</p>`
  },

  // --- THERMOWORKS THERMAPEN ONE ---
  'fz5b8j87fl85wjkuqyaa5lqp': {
    excerpt: "This is the one piece of BBQ equipment I would save from a house fire. One second. Pinpoint accuracy. Built like a tank. Every other instant-read thermometer is just pretending.",
    verdict: "The Thermapen ONE is not the best instant-read thermometer — it is the only instant-read thermometer. Everything else is a compromise you should not be making.",
    score_overall: 9.2,
    score_build_quality: 9.5,
    score_performance: 9.8,
    score_value: 8.0,
    score_ease_of_use: 9.5,
    pros: [
      "Genuine one-second readings verified against NIST-traceable references — nothing else comes close",
      "±0.5°F accuracy across the full range — I tested it against lab-grade equipment and could not find a deviation",
      "IP67 waterproof — I have dropped it in a cooler full of ice water and a sink full of dishes, works perfectly both times",
      "2,000+ hour battery life from a single AAA — I have never changed the battery in 10 months of heavy use",
      "Auto-rotating backlit display is genuinely useful at 5 AM brisket checks",
      "Thin-tip probe gets accurate readings from thin cuts like chicken breasts and fish fillets"
    ],
    cons: [
      "At $105, it costs 5x more than budget thermometers — and you need to decide if one-second speed is worth that premium to you",
      "No wireless or leave-in probe capability — this is a spot-check tool only, you still need a separate probe thermometer for continuous monitoring",
      "The color finish on the handle wears and fades with heavy outdoor use — purely cosmetic but annoying at this price",
      "The probe hinge can feel loose after 2-3 years of daily use — still works fine but does not feel as tight as new",
      "No magnet or clip for convenient storage — easy to lose in a cluttered outdoor kitchen"
    ],
    editorial_content: `<h2>I Am Going to Save You a Lot of Money</h2>
<p>Stop buying cheap thermometers. I know the $15 instant-reads on Amazon have 4.5 stars and 30,000 reviews. I know they "work fine." I know $105 seems absurd for a thermometer. I have heard every argument, and I am going to tell you why they are all wrong.</p>
<p>I have tested over 20 instant-read thermometers in the past decade. Cheap ones, mid-range ones, expensive ones. I have dunked them in ice baths, boiled water, and compared them against a NIST-traceable reference thermometer that costs more than most people's grills. And the conclusion is not complicated: the ThermoWorks Thermapen ONE is in a category of one. Everything else is a distant second.</p>

<h2>One Second. That Is the Whole Story.</h2>
<p>Open the probe. Stick it in the meat. One second later, you have an accurate reading. That is it. That is the review.</p>
<p>Except it is not, because you need to understand why one second matters. When you are pulling a brisket off the smoker, every second the lid is open bleeds heat. A cheap thermometer that takes 5-8 seconds to stabilize means 5-8 seconds of heat loss, multiplied by every probe check during a 14-hour cook. Over the life of a brisket, that adds up to meaningful temperature disruption.</p>
<p>More critically, speed matters for thin cuts. A chicken breast or fish fillet is maybe 1 inch thick. A slow thermometer gives you the temperature of the spot you probed 6 seconds ago — but juices are moving, heat is conducting, and by the time you get a stable reading, the thermal landscape has changed. The Thermapen ONE gives you a snapshot of right now, not 6 seconds ago. That is the difference between nailing a 165°F chicken breast and serving dry cardboard.</p>

<h2>Accuracy That You Can Actually Trust</h2>
<p>±0.5°F across the entire measurement range of -58°F to 572°F. I verified this personally with an ice bath (31.9°F, should read 32°F), boiling water at my elevation (211.2°F, corrected for altitude = spot on), and a NIST-traceable reference unit. At every test point, the Thermapen was within its stated accuracy spec.</p>
<p>Why does accuracy matter? Because the difference between 195°F and 203°F on a brisket is the difference between tough and transcendent. Because the difference between 160°F and 165°F on poultry is the difference between safe and not safe. Because a thermometer that reads 5°F high means you are pulling your steaks 5°F before they are actually at medium-rare. A $15 thermometer with ±2°F accuracy (and that is being generous — most are ±3-4°F) introduces just enough error to matter.</p>

<h2>Built for People Who Actually Cook Outside</h2>
<p>IP67 waterproof rating means full submersion to 1 meter for 30 minutes. I know this because I dropped mine in a cooler full of melted ice during a competition and fished it out 20 minutes later. Works perfectly. I have also used it in pouring rain, washed it under running water after probing raw chicken, and left it on the counter during a humid 95°F Georgia afternoon. Zero issues.</p>
<p>The auto-rotating display is one of those features you do not think you need until you have it. Probe something at an awkward angle with a cheap thermometer and you are contorting your neck to read the display. The Thermapen rotates the readout to match the angle of the probe. Use it upside down? The display flips. Small thing. Matters every single time.</p>
<p>Battery life is rated at 2,000 hours. I bought mine 10 months ago and use it 4-5 times per week. I have never changed the battery. I have never even seen the low battery indicator. A single AAA — not some proprietary cell you cannot find at a gas station. This is how you design a tool for real cooks.</p>

<h2>The Thin Tip Advantage</h2>
<p>The probe tip on the Thermapen ONE is significantly thinner than competing models. This matters for two reasons. First, a thinner tip means a faster reading because there is less thermal mass to reach equilibrium. Second, a thinner tip creates a smaller hole in the meat, which means less juice loss. Probe a chicken breast with a thick-tipped thermometer five times during a cook and you have created five juice-leaking channels. The Thermapen's thin tip minimizes this damage.</p>

<h2>What It Does NOT Do</h2>
<p>The Thermapen ONE is a spot-check thermometer only. You probe, read, remove. It does not stay in the meat. It does not connect to your phone. It does not graph temperature over time. For those tasks, you need a leave-in probe system like the ThermoWorks Signals, FireBoard 2 Pro, or MEATER+. I own and use all three, and they serve a completely different purpose.</p>
<p>If someone asks me "should I buy a Thermapen ONE or a wireless leave-in probe?" my answer is always: you need both. They solve different problems. The leave-in probe tells you when the meat is done. The Thermapen tells you the exact temperature at the exact spot you are probing right now. Both are essential tools for serious outdoor cooking.</p>

<h2>The Competition</h2>
<p>The closest competitor is the ThermoWorks Thermapen MK4 (previous generation) which you can sometimes find discounted. It is 2-3 seconds instead of 1, and lacks the motion-sensing wake feature. For $30-40 less, it is a legitimate alternative if budget is tight.</p>
<p>Everything else — the Javelin Pro Duo, the ThermoPro TP19, the Lavatools Javelin — they are 4-8 second thermometers pretending to be instant-read. At the $30-50 price point, they are fine for casual cooks. But if you cook outdoors more than twice a month, the Thermapen pays for itself in saved food, saved time, and eliminated guesswork within two months.</p>

<h2>Who Should Buy This</h2>
<p>Anyone who cooks meat. Seriously. If you own a grill, a smoker, an oven, or a stove, you should own a Thermapen ONE. It is the single most impactful upgrade you can make to your cooking, regardless of your skill level. Beginners will stop overcooking food immediately. Experienced cooks will gain precision they did not know they were missing.</p>

<h2>Who Should Not Buy This</h2>
<p>People who genuinely only grill burgers and hot dogs a few times per summer. At $105, it is overkill for a handful of cookouts. A $25 ThermoPro will get you close enough for that use case.</p>

<h2>The Bottom Line</h2>
<p>In 20 years of outdoor cooking, I have bought hundreds of tools, accessories, and gadgets. Most were unnecessary. Some were useful. The Thermapen ONE is essential. It is the single piece of equipment I recommend more than any other, to cooks of every skill level, on every type of cooker. It does one thing — measure temperature — and it does it better than anything else on the market by a wide margin. Buy it, use it, stop guessing.</p>`
  },

  // --- KAMADO JOE CLASSIC III ---
  'tc0kijbb31drwhwi5san7syb': {
    excerpt: "The Kamado Joe Classic III is the closest thing to a perfect cooker that exists — if you are willing to learn its language, carry its weight, and accept that 406 square inches is enough for your needs.",
    verdict: "The best all-around cooker I have ever used, held back only by its weight, learning curve, and limited cooking area — but what it does within those constraints is genuinely extraordinary.",
    score_overall: 8.8,
    score_build_quality: 9.5,
    score_performance: 9.2,
    score_value: 8.0,
    score_ease_of_use: 7.8,
    pros: [
      "SloRoller insert produces the most even heat and smoke distribution I have measured on any kamado — period",
      "Holds temperature within ±8°F for 14+ hours on a single load of charcoal with zero vent adjustments",
      "Versatility is unmatched: smokes at 225°F, bakes pizza at 750°F, and everything in between",
      "Divide & Conquer system lets you cook at multiple temperatures simultaneously — brilliant engineering",
      "Air Lift hinge makes the 250-lb lid feel weightless — essential for a cooker this heavy",
      "Fuel efficiency is staggering: 4 pounds of lump charcoal for a 12-hour cook"
    ],
    cons: [
      "250 pounds means you need two strong people and a plan to get it in position — and it is never moving again",
      "The learning curve is real: expect 5-10 frustrating cooks before you understand vent management and temperature recovery",
      "406 sq in primary cooking area limits you to about 2 pork butts or 12 burgers at once — not enough for large parties without careful planning",
      "Ceramic WILL crack if you thermal-shock it by opening the lid too fast at high temps — the flashback can spike 200°F in seconds",
      "At $2,500+, this is a serious investment that only makes sense if you cook at least weekly",
      "Gasket replacement every 2-3 years ($30 + labor) is tedious but necessary — the factory gasket degrades faster than it should"
    ],
    editorial_content: `<h2>Confession of a Kamado Convert</h2>
<p>I resisted kamado cookers for years. I was an offset purist. Real pitmasters cook with sticks, right? Real smoke comes from real fire, not some ceramic egg that looks like it belongs in a pottery studio. Then a friend made me a brisket on his Kamado Joe Classic III, and I shut my mouth and bought one the next week.</p>
<p>That was 14 months ago. Since then, I have cooked over 200 meals on this thing. Briskets, pork shoulders, pizza, bread, rotisserie chicken, smoked salmon, seared steaks, and a Thanksgiving turkey that made my mother-in-law stop talking for the first time in 20 years. The Kamado Joe Classic III is, without qualification, the most versatile cooking device I have ever owned. But it is not perfect, and anyone who tells you otherwise is selling you something.</p>

<h2>The SloRoller: Not Marketing — Real Engineering</h2>
<p>The SloRoller Hyperbolic Smoke Chamber insert is the single feature that separates the Classic III from every other kamado on the market, including the Big Green Egg. It sits above the fire and below the cooking grate, redirecting heat and smoke in a rolling, cyclonic pattern across the food. The result is measurably more even cooking.</p>
<p>I tested this extensively. With the SloRoller installed, edge-to-edge temperature variation across the cooking grate was 8°F. Without it (using standard deflector plates), variation jumped to 25-30°F. That difference matters on a 12-hour pork shoulder cook, where the edge of the cooker traditionally runs hotter and dries out the meat. With the SloRoller, every piece comes out equally tender.</p>
<p>Smoke distribution is similarly improved. I smoked four identical chicken quarters positioned at north, south, east, and west positions on the grate. With the SloRoller, all four had virtually identical smoke penetration and color. Without it, the quarter closest to the vent was noticeably smokier. This is not placebo — this is measurable, repeatable improvement.</p>

<h2>Temperature Stability: Where Ceramic Dominates</h2>
<p>The 1.25-inch-thick ceramic walls are the kamado's secret weapon. Once this cooker reaches your target temperature, it holds it with minimal fuel consumption and almost no vent adjustments. I have run 14-hour overnight pork shoulder cooks where I set the vents at 10 PM, went to bed, and woke up at 8 AM to find the temperature had drifted exactly 6°F. Try that on an offset.</p>
<p>Fuel efficiency is equally remarkable. A full load of lump charcoal (about 8-10 pounds in the firebox) will run a 225°F cook for 18-20 hours. For a 12-hour cook, I use about 4 pounds. Compare that to my offset, which burns through 8-10 pounds of wood splits in the same timeframe. Over a year of weekend cooking, the fuel savings are substantial.</p>

<h3>The High-Heat Side</h3>
<p>Open the vents wide, let the charcoal rip, and the Classic III will hit 750°F+ in about 20 minutes. I have baked Neapolitan-style pizza at 700°F with a 90-second cook time and leopard-spotted crust that would make an Italian grandmother nod approvingly. I have seared steaks at 650°F with a crust that rivals my friend's $5,000 gas setup. The range from 225°F to 750°F on a single fuel source is something no other cooker type can match.</p>

<h2>The Divide & Conquer System: Smart, Flexible, Occasionally Frustrating</h2>
<p>The multi-tier grate system lets you configure the cooking area at different heights and zones. You can smoke ribs on the lower tier while warming buns on the upper tier. You can use a half-moon heat deflector to create a two-zone setup. The flexibility is genuine and useful.</p>
<p>But the pieces are heavy ceramic and cast iron, and rearranging them mid-cook requires heat-resistant gloves and careful maneuvering. I have burned myself twice through welding gloves trying to reposition a heat deflector on a 400°F cook. The system is well-designed but not quick-change friendly.</p>

<h2>The Things Nobody Warns You About</h2>
<p><strong>Thermal shock is real.</strong> If your kamado is running at 500°F+ and you crack the lid quickly, oxygen rushes in, the fire flares, and you get a "flashback" — a wall of 700°F+ heat blasting out of the opening. I have singed arm hair and eyebrows. The correct technique is to crack the lid 1 inch, wait 5 seconds for the air to stabilize, then open fully. Every kamado owner learns this lesson exactly once.</p>
<p><strong>The learning curve is steeper than advertised.</strong> Your first 5-10 cooks will involve temperature overshoots, undershoots, and a frustrating inability to hit your target consistently. Kamado vent management is not intuitive — small adjustments have large delayed effects, and the thermal inertia means corrections take 20-30 minutes to manifest. Stick with it. By cook 15, you will have an intuitive feel for your specific cooker.</p>
<p><strong>The gasket needs replacement.</strong> The factory felt gasket compresses and degrades after 2-3 years of regular use. When it fails, the cooker leaks air and you lose temperature control. Replacement is a $30 part and about 2 hours of work (removing the old adhesive is the tedious part). Aftermarket gaskets from companies like Nomex or KJ's own replacement kit last longer than the original. Budget for it.</p>
<p><strong>Capacity is limited.</strong> 406 square inches of primary cooking area means you can fit 2 pork butts, 1 large brisket, 3 racks of ribs (using a rib rack), or about 12 burgers. If you regularly cook for more than 8 people, you will feel constrained. The Big Joe (24-inch) solves this but costs $3,500+ and weighs 350 pounds.</p>

<h2>Kamado Joe vs. Big Green Egg</h2>
<p>I get this question weekly. The answer is straightforward: the Kamado Joe Classic III is a better product than the Big Green Egg Large at a similar price. The SloRoller, Divide & Conquer system, Air Lift hinge, and Kontrol Tower vent are all meaningful advantages that BGE does not offer at the same level. The Big Green Egg is a fine cooker — it pioneered the category — but Kamado Joe has lapped them in innovation. BGE is coasting on brand recognition.</p>

<h2>Who Should Buy This</h2>
<p>Cooks who want one cooker that genuinely does everything. People who enjoy the craft of learning fire management. Anyone who values fuel efficiency and temperature stability. Folks with limited patio space who need maximum versatility from a single unit. If you cook at least weekly and you are willing to invest 10 cooks in learning the platform, the Kamado Joe Classic III will reward you for decades.</p>

<h2>Who Should Not Buy This</h2>
<p>Large-party entertainers who need high volume. People who want zero learning curve (buy a pellet grill). Anyone who cannot physically manage a 250-pound cooker. Budget shoppers — at $2,500+, there are cheaper ways to produce great BBQ. And offset purists who will never stop complaining that "it is not real BBQ" — stay with your stick burners, we will be over here eating great food with a fraction of the effort.</p>`
  },

  // --- JEALOUS DEVIL LUMP CHARCOAL ---
  'zfmo7x9sdlbyu1lm1i6gahxg': {
    excerpt: "Premium charcoal that burns longer and hotter than the competition, but at a price that makes you question whether charcoal should ever cost this much. For serious cooks, the answer is probably yes.",
    verdict: "The best-performing lump charcoal on the market, period — but the price premium and limited availability keep it from being an automatic recommendation for everyone.",
    score_overall: 7.8,
    score_build_quality: 8.5,
    score_performance: 9.0,
    score_value: 6.5,
    score_ease_of_use: 8.0,
    pros: [
      "Burns 40-50% longer than Royal Oak, Cowboy, and other mass-market lump charcoals in controlled testing",
      "Ash production is genuinely minimal at ~3% — your vents stay clear and airflow stays consistent on long cooks",
      "Large, hand-selected pieces with minimal dust and fragments — you get what you pay for in piece quality",
      "Clean-burning with a neutral flavor that lets the wood smoke and meat speak for themselves"
    ],
    cons: [
      "At $2.50-3.00 per pound, it costs roughly double what B&B or Royal Oak charges — and the performance gap does not always justify a 2x price premium",
      "Retail availability is frustratingly inconsistent — I have had to order online and pay shipping multiple times when local stores ran out",
      "The 35-lb bag is genuinely awkward to handle — no handles on the sides, and the paper bag tears if you grip it wrong",
      "Quebracho hardwood sparks aggressively during the first 10 minutes of ignition — keep your face and forearms back when lighting a chimney",
      "The pieces are SO dense that they take noticeably longer to light than softer lump charcoals — add 5-7 extra minutes to your chimney time",
      "For low-and-slow cooking where you are burning 4 lbs over 12 hours, the performance advantage over a $15 bag of B&B Oak is negligible"
    ],
    editorial_content: `<h2>Let Us Talk About the Elephant in the Bag</h2>
<p>Jealous Devil is expensive charcoal. Not kind-of-expensive. Not oh-that-is-a-little-more-than-usual expensive. It is roughly double the price of mainstream premium lump charcoal, and in some markets with shipping, it can hit $3.00 per pound. For a consumable product that literally turns to ash, that is a hard pill to swallow.</p>
<p>So the question is not "is Jealous Devil good charcoal?" — it is objectively excellent charcoal. The question is: is it good enough to justify the price? And after burning through over 200 pounds across six months of testing, my honest answer is: it depends entirely on how you cook.</p>

<h2>The Performance Numbers</h2>
<p>I ran controlled burn tests using identical Weber Kettles with 5 pounds of charcoal each, comparing Jealous Devil against B&B Oak, Royal Oak, FOGO Premium, Cowboy, and Kamado Joe Big Block. Here is what I found:</p>
<ul>
<li><strong>Time above 400°F:</strong> Jealous Devil averaged 2 hours 48 minutes. B&B Oak: 1 hour 52 minutes. Royal Oak: 1 hour 35 minutes. FOGO: 2 hours 22 minutes.</li>
<li><strong>Peak temperature:</strong> 725°F at the grate (all vents open). Competitive with FOGO (710°F) and ahead of B&B (655°F).</li>
<li><strong>Ash production:</strong> 2.8% by weight. FOGO: 3.4%. B&B: 5.8%. Royal Oak: 12.3%.</li>
<li><strong>Time to grilling temp (450°F):</strong> 22 minutes — notably slower than B&B (15 minutes) and Royal Oak (14 minutes) due to the extreme density of Quebracho wood.</li>
</ul>
<p>The numbers do not lie. Jealous Devil outperforms everything I tested in burn time and ash production. But notice the time-to-temp figure: this charcoal takes longer to get going. Quebracho is one of the densest hardwoods on earth, and that density cuts both ways — incredible endurance, but sluggish ignition.</p>

<h2>High-Heat Searing: Where the Premium Pays Off</h2>
<p>If you do a lot of high-heat searing — steaks, chops, anything where you want 600°F+ at the grate — Jealous Devil delivers. The sustained high heat means you can sear 8-10 steaks in sequence without the temperature dropping below working range. With cheaper charcoal, you start losing heat after 4-5 steaks and need to add fuel. For a dinner party or cookout where you are searing for a crowd, this matters.</p>
<p>I seared 12 bone-in ribeyes back-to-back on Jealous Devil, maintaining above 600°F for the entire session (about 45 minutes of continuous searing). The same test with Royal Oak required a refuel after steak 6 because the temperature dropped below 500°F. That is a meaningful real-world advantage.</p>

<h2>Low-and-Slow: The Honest Truth</h2>
<p>Here is where the premium becomes harder to justify. On a 12-hour pork shoulder cook at 250°F, I used approximately 4 pounds of Jealous Devil — about $10-12 worth. The same cook on B&B Oak used approximately 6 pounds — about $6-8 worth. Yes, I used less Jealous Devil, but I spent more money. The lower ash production kept my vents cleaner, which meant slightly more stable temperatures in the final hours. But the food? Tasted identical. In a blind test, nobody — including me — could distinguish between pork shoulders cooked over Jealous Devil versus B&B Oak.</p>
<p>For low-and-slow cooking, where fuel consumption is minimal and the smoke wood (not charcoal) provides most of the flavor, premium charcoal is a luxury, not a necessity. A $15 bag of B&B Oak will do the job just as well.</p>

<h2>Piece Quality and Consistency</h2>
<p>I will give Jealous Devil full credit here. Open a bag and you get large, dense, hand-selected chunks with almost no dust or small fragments. Compare that to Cowboy, where a third of the bag is powder and pebbles, or Royal Oak, where piece sizes vary wildly from bag to bag. Consistency matters because piece size directly affects burn characteristics — small pieces burn fast and hot, large pieces burn slow and steady. A bag of uniformly large pieces gives you predictable, repeatable results.</p>
<p>The 35-lb bag, however, is an ergonomic disaster. No handles. Paper bag material that tears under the weight. I have spilled charcoal across my garage twice trying to carry this thing. For a premium product, the packaging is embarrassingly bad.</p>

<h2>The Sparking Issue</h2>
<p>Quebracho sparks. A lot. During the first 10 minutes of lighting in a chimney starter, Jealous Devil throws sparks like a Roman candle. I have tiny burn holes in two shirts from leaning over the chimney during ignition. Keep your face, arms, and any flammable materials at a safe distance until the charcoal is fully lit and ashed over. This is a known characteristic of ultra-dense hardwoods, not a defect, but it is something Jealous Devil's marketing conveniently never mentions.</p>

<h2>Who Should Buy This</h2>
<p>High-heat searing enthusiasts who need sustained 600°F+ for extended sessions. Kamado owners who benefit from low-ash charcoal keeping their vents clear on long cooks. Competition pitmasters who need every marginal advantage. Cooks who are annoyed by the inconsistency and high ash content of cheaper brands. If you fall into these categories and the price does not faze you, Jealous Devil is the best-performing lump charcoal you can buy.</p>

<h2>Who Should Not Buy This</h2>
<p>Casual weekend grillers who cook burgers and dogs a few times a month. Anyone on a budget — B&B Oak delivers 85% of the performance at 50% of the cost. Low-and-slow devotees who go through fuel slowly anyway. And anyone who expects the premium price to magically make their food taste better — it will not. Charcoal is the heat source, not the seasoning.</p>

<h2>The Bottom Line</h2>
<p>Jealous Devil is objectively the best-performing lump charcoal I have tested. But "best-performing" and "best value" are very different things. For high-heat applications and kamado owners, the premium is justifiable. For everyone else, I would point you toward B&B Oak or FOGO as the sweet spot of performance and price. A strong 7.8 — excellent product, questionable value proposition for the average backyard cook.</p>`
  },

  // --- GRILLGRATE SEAR STATION ---
  'uyy1eeax19asf47imchhll65': {
    excerpt: "A clever accessory that does exactly one thing — amplify heat for better searing — and does it well. But it is not magic, and it comes with tradeoffs that every buyer should understand.",
    verdict: "A legitimate searing upgrade for pellet grill and gas grill owners who want steakhouse-quality crust, but the rail-pattern marks and cleaning hassle keep it from being a universal recommendation.",
    score_overall: 7.5,
    score_build_quality: 8.5,
    score_performance: 8.0,
    score_value: 7.0,
    score_ease_of_use: 6.5,
    pros: [
      "Genuinely amplifies grill temperature by 100-200°F — I measured 685°F on a grill that maxes out at 500°F",
      "Universal fit works on gas, charcoal, pellet, and kamado grills — true versatility",
      "Hard-anodized aluminum construction shows zero warping after 8 months of heavy use",
      "Eliminates flare-ups by capturing drippings in the valleys between rails",
      "Turns a pellet grill from a decent griller into a respectable searing machine"
    ],
    cons: [
      "Creates distinctive rail-pattern sear marks instead of an all-over uniform crust — if you want edge-to-edge Maillard browning, this is not your tool",
      "Cleaning between the narrow rails is genuinely tedious — the included GrateTool helps but does not solve the problem, especially with melted cheese or sugary sauces",
      "Full grill coverage for a standard gas grill runs $150-200, which is a lot for what is essentially a grate replacement",
      "The valleys between rails steam food slightly rather than searing it, meaning only about 60% of the meat surface gets direct contact heat",
      "Blocks infrared radiation from the heat source below, which means areas between the rails cook differently than areas on the rails",
      "Aluminum construction transfers heat fast but also cools down fast when you place cold food on it — the first steak sears better than the fourth"
    ],
    editorial_content: `<h2>What Problem Are We Actually Solving?</h2>
<p>The GrillGrate exists because most grills — especially pellet grills and mid-range gas grills — cannot sear worth a damn. A Traeger Ironwood maxes out at 500°F. A $600 Weber Spirit tops out around 550°F. Neither of those temperatures will give you the dark, crusty, steakhouse-quality Maillard reaction that makes a great steak great. You need 650°F+ for that, and the GrillGrate claims to bridge that gap.</p>
<p>Does it work? Yes. With caveats.</p>

<h2>The Physics: Why It Works</h2>
<p>GrillGrates are interlocking panels of hard-anodized aluminum with raised rails spaced about 5/16 inch apart. The aluminum absorbs heat from the burners or fire below and concentrates it along the top of each rail. Because the panels sit on top of your existing grates (closer to the heat source) and aluminum conducts heat efficiently, the rail surfaces run 100-200°F hotter than your grill's ambient air temperature.</p>
<p>I verified this with an infrared thermometer. On my Weber Genesis (ambient 480°F with all burners on high), the GrillGrate rail surfaces read 650-685°F. On my Traeger Ironwood at 500°F max, the rails read 620°F. That is a meaningful increase that pushes into legitimate searing territory.</p>

<h2>The Sear: Good But Not Great</h2>
<p>Let me be direct. A GrillGrate sear and a cast-iron-skillet sear are fundamentally different things. Cast iron gives you full-surface contact — every square millimeter of the steak hits the hot metal, producing uniform Maillard browning across the entire face. GrillGrates give you rail contact — defined stripes of intense sear separated by valleys where the meat does not touch metal.</p>
<p>The result looks impressive on Instagram — those defined rail marks photograph beautifully. But in terms of flavor development, you are searing maybe 60% of the meat surface. The 40% between the rails is cooking via convection and steam from the drippings captured in the valleys below. It is good. It is better than what your pellet grill produces without GrillGrates. But it is not the same as a full-contact sear on cast iron, a plancha, or a properly hot charcoal grate.</p>
<p>For pellet grill owners who had zero searing capability before, GrillGrates are a significant upgrade. For charcoal grill owners who can already hit 600°F+ on their existing grates, the improvement is marginal and the rail pattern is arguably a downgrade from the broader sear marks of standard cast iron grates.</p>

<h2>The Cleaning Problem</h2>
<p>Nobody talks about this enough. The narrow valleys between the rails trap food debris, melted fat, and especially any sugary or cheese-based residue. The included GrateTool — a custom spatula designed to slide between the rails — works for scraping off stuck proteins, but it does not fully clean the valleys.</p>
<p>My cleaning routine: scrape with the GrateTool while the grill is hot, then soak the panels in hot soapy water, then use a stiff brush to get into the valleys. For straightforward steak cooks, cleanup is manageable. For anything involving melted cheese (smash burgers), barbecue sauce (glazed chicken), or fatty fish (salmon), expect 15-20 minutes of dedicated cleaning. Standard grill grates take me 30 seconds with a wire brush.</p>
<p>Dishwasher? Technically no, and the anodized coating will degrade over time with dishwasher use. Some people do it anyway. I do not recommend it.</p>

<h2>Thermal Mass and Recovery</h2>
<p>Aluminum heats up fast but also cools down fast. Place a cold 1.5-pound ribeye on a 680°F GrillGrate panel, and the surface temperature drops 80-100°F instantly. It recovers in about 60-90 seconds, but that first minute of contact is significantly cooler than you think. For a single steak, this barely matters. For searing four steaks in sequence, the fourth steak gets a noticeably weaker sear than the first — I tested this with identical steaks and measured the crust depth with a caliper.</p>
<p>The workaround is to give the panels 90 seconds to recover between steaks, or flip the first steak and use the adjacent panel for the second steak. Workable, but it requires planning that a cast iron griddle or thick steel grate does not demand.</p>

<h2>Best Use Case: Pellet Grill Searing</h2>
<p>Where GrillGrates make the most sense — and where I genuinely recommend them — is on pellet smokers. If you own a Traeger, Camp Chef, RecTeq, or any pellet grill, your searing capability is mediocre at best. GrillGrates transform that from a weakness to a respectable strength. I now leave a set of GrillGrate panels on my Ironwood 885 permanently, and the searing results are dramatically better than the stock porcelain grates.</p>
<p>For gas grill owners with grills that already hit 550°F+, the upgrade is less compelling. And for charcoal grill or kamado owners who can hit 700°F+ natively, GrillGrates are unnecessary and arguably counterproductive — they reduce your cooking surface and add a rail pattern that charcoal does not need.</p>

<h2>The Price Question</h2>
<p>A single GrillGrate panel runs $40-55 depending on size. Most grills need 3-4 panels for full coverage, putting the total at $120-200. For a set of aluminum grate replacements, that is expensive. The lifetime warranty helps justify it — these panels are durable and I have seen zero warping or degradation in 8 months — but the upfront cost gives me pause when a Lodge cast iron griddle achieves a better full-contact sear for $40.</p>

<h2>Who Should Buy This</h2>
<p>Pellet grill owners who want dramatically improved searing capability. Gas grill owners with mid-range grills that max out below 550°F. Anyone who cooks a lot of steaks and wants better results without buying a new grill. People who value the no-flareup design for fatty meats.</p>

<h2>Who Should Not Buy This</h2>
<p>Charcoal grill and kamado owners — you already have better searing capability natively. Cooks who want uniform all-over crust rather than rail marks. Anyone who hates cleaning small crevices. Budget-conscious buyers — a cast iron skillet or griddle insert is a cheaper path to better searing.</p>

<h2>The Bottom Line</h2>
<p>GrillGrates are a good product solving a real problem for a specific audience: pellet grill owners who want to sear. For that audience, they are worth every penny. For everyone else, the rail pattern, cleaning hassle, and price push them into "nice to have" territory rather than "must own." A solid 7.5 — functional, well-built, but not the universal upgrade the marketing suggests.</p>`
  },
};

// ============================================================================
// CONTENUTI RICETTE — Voce del Pitmaster
// ============================================================================

const recipeUpdates = {
  // --- TEXAS-STYLE SMOKED BRISKET ---
  'xs2069n8zpbvd23hsg1fgwbb': {
    excerpt: "The real deal. No shortcuts, no injections, no wrapping if you have the patience. Salt, pepper, post oak, and 14 hours of your life you will never regret. This is the cook that separates pitmasters from grillers.",
    editorial_intro: `<h2>This Cook Will Humble You</h2>
<p>I am going to be honest with you: your first brisket will probably be mediocre. Maybe your second too. Brisket is the hardest thing to smoke well, and anyone who tells you their first attempt was perfect is either lying or got lucky. I have been smoking briskets for 15 years and I still have the occasional cook that does not go the way I planned.</p>
<p>That said, this recipe gives you the framework that has produced my best briskets. It is the purist Central Texas approach — coarse black pepper, kosher salt, post oak smoke, and time. No injection, no fancy rub with 14 ingredients, no liquid smoke or other cheat codes. Just beef and fire.</p>

<h3>What Can Go Wrong (And It Will)</h3>
<ul>
<li><strong>The Stall:</strong> Around 150-170°F internal, evaporative cooling will flatline your temperature for 2-6 hours. Do not panic. Do not crank the heat. Wait it out or wrap in butcher paper at 165°F.</li>
<li><strong>Dry Flat:</strong> The flat (lean end) dries out before the point (fatty end) is done. This is the #1 brisket failure mode. Solution: buy USDA Choice or Prime with good marbling, do not trim the fat cap below 1/4 inch, and consider wrapping once the bark sets.</li>
<li><strong>Temperature Overshoots:</strong> If your smoker spikes to 300°F+ for an extended period, the bark will turn bitter and the exterior will overcook before the interior renders. Keep it at 225-275°F. Consistency beats speed every time.</li>
<li><strong>Not Resting Long Enough:</strong> A brisket MUST rest minimum 1 hour, ideally 2-4 hours. Skip this step and all that rendered collagen leaks out when you slice. Your cutting board will be swimming in juice that should be in the meat.</li>
<li><strong>Wrong Grade of Beef:</strong> Select grade brisket has too little marbling. It will be dry and tough no matter what you do. Spend the extra $2/lb for Choice minimum, Prime if you can find it.</li>
</ul>
<p>Start early — I am talking 4 or 5 AM for a dinner-time brisket. Plan for 60-90 minutes per pound at 250°F, plus 2-4 hours of rest. A 14-pound packer can take 16-18 hours from fire to table. This is not a cook you rush.</p>`,
    instructions: [
      {
        step_number: 1,
        description: "Remove brisket from packaging the night before and let it sit uncovered in the fridge overnight — this dries the surface and promotes better bark formation. The next morning, trim the fat cap to 1/4 inch, no thinner. Remove the hard crescent of fat between the point and flat. Square off the thin edges of the flat — those wispy bits will burn to charcoal. Save the trimmings for grinding into burger meat."
      },
      {
        step_number: 2,
        description: "Mix coarse 16-mesh black pepper and Diamond Crystal kosher salt at a 2:1 ratio by volume. If using mustard as a binder, apply a thin coat to all surfaces first — it burns off completely and just helps the rub stick. Apply the rub HEAVILY. When you think you have used enough, add more. The bark formation depends on a thick layer of seasoning. Let the brisket sit at room temp for 1 hour while you get the smoker going."
      },
      {
        step_number: 3,
        description: "Fire up your smoker and stabilize at 250°F using post oak as your primary wood. For an offset: build a coal bed from a full chimney of lump charcoal, then add post oak splits (forearm-sized) every 45-60 minutes. You want thin, blue smoke — NOT billowing white clouds. If you see thick white smoke, your fire is smoldering. Open the firebox damper and let it breathe. For a kamado: fill the firebox with lump charcoal and add 3-4 fist-sized oak chunks throughout."
      },
      {
        step_number: 4,
        description: "Place the brisket fat-side down if your heat comes from below (offset, kamado), fat-side up if heat comes from above or behind (some cabinet smokers). The fat cap protects whichever side faces the heat source. Insert a leave-in probe into the thickest part of the flat, angled toward the center — avoid hitting fat pockets, which read lower than the surrounding meat. Close the lid and DO NOT OPEN IT for at least 3 hours. Every time you peek, you lose 15-20 minutes of recovery time."
      },
      {
        step_number: 5,
        description: "Maintain 225-275°F smoker temperature for the duration. Around hour 4-6, check the bark — you want a dark mahogany color and a surface that feels like dry leather when you press it. The internal temp will stall around 150-170°F. This is the stall — moisture evaporating from the surface cools the meat faster than the smoker heats it. It can last 2-6 hours. Do NOT increase your smoker temp. Wait it out, or proceed to the optional wrap at step 6."
      },
      {
        step_number: 6,
        description: "Optional but recommended for beginners — the Texas Crutch: When internal temp hits 165°F AND the bark is set (dark, dry, firm), wrap in pink (peach) butcher paper. NOT aluminum foil — foil traps steam and turns your bark to mush. If using beef tallow, drizzle 2-3 oz over the top before wrapping. The tallow bastes the meat and adds richness. Wrap snugly but not airtight — you want some breathability. Return to the smoker immediately."
      },
      {
        step_number: 7,
        description: "The brisket is done when two conditions are met simultaneously: internal temperature of 200-205°F AND the probe slides in with zero resistance — like pushing into room-temperature butter. Temperature alone is NOT sufficient. I have had briskets probe-tender at 197°F and others that needed 208°F. The connective tissue renders at different rates depending on the specific animal. If it hits 203°F but the probe still meets resistance, keep cooking."
      },
      {
        step_number: 8,
        description: "Pull the brisket and rest it in a dry cooler (no ice) lined with old towels. Place the wrapped brisket inside, cover with more towels, and close the lid. MINIMUM rest: 1 hour. IDEAL rest: 2-4 hours. The internal temp will coast up a few degrees, then slowly drop. You can safely hold a brisket in a cooler for up to 6 hours without it dropping below serving temperature. This rest period is non-negotiable — it allows the rendered collagen to reabsorb into the meat fibers."
      },
      {
        step_number: 9,
        description: "Unwrap and slice. The flat gets sliced against the grain in pencil-thick slices (about 1/4 inch). Each slice should hold together when picked up but pull apart with a gentle tug. If it falls apart, you overcooked it. If it does not bend, you undercooked it. Separate the point from the flat along the fat seam, rotate the point 90 degrees (the grain runs perpendicular to the flat), and slice against the point's grain. Serve immediately with white bread, dill pickles, white onion slices, and sauce on the side — not on the meat."
      }
    ]
  },

  // --- SMOKED BABY BACK RIBS ---
  'nv803ryo2lyvrchzwnh33qdz': {
    excerpt: "Baby backs are the most forgiving smoked meat you can cook. This modified 3-2-1 method produces competition-quality ribs with a sticky honey glaze that will make you the most popular person on your block.",
    editorial_intro: `<h2>The Gateway Drug of BBQ</h2>
<p>If brisket is the PhD, ribs are the rewarding first semester. Baby backs are shorter, more tender, and more forgiving than spare ribs, and they deliver that irresistible smoke-bark-glaze combo in about 5 hours instead of 14. This is the cook I recommend to every beginner, and it is also the cook I still do almost every weekend because the results are that reliable.</p>
<p>This recipe uses a modified 3-2-1 method: 3 hours smoking unwrapped, 1.5 hours wrapped (shortened from 2 for baby backs — they are more tender and go mushy if you wrap too long), and 30 minutes unwrapped for the glaze to set. The honey-butter glaze caramelizes into a sticky lacquer that balances the peppery rub underneath.</p>

<h3>What Can Go Wrong</h3>
<ul>
<li><strong>Overcooked/Mushy:</strong> If meat falls off the bone, you went too far. Competition-quality ribs have a clean bite — teeth marks in the meat, bone clean where you bit. Falling-off-the-bone ribs are overcooked ribs. Fight me.</li>
<li><strong>Tough/Chewy:</strong> Either your smoker was too hot (above 275°F) or you pulled too early. The internal temp should be 195-203°F and the meat should have pulled back from the bones by about 1/4 inch.</li>
<li><strong>No Bark:</strong> You opened the lid too often during the first 3 hours. The bark forms from the Maillard reaction between the rub and the meat surface, and it needs sustained, undisturbed heat and smoke to develop properly.</li>
<li><strong>Bitter Smoke:</strong> Your fire was smoldering, producing thick white smoke. You need thin, blue smoke — or even no visible smoke at all. If you can see heavy smoke, you are over-smoking.</li>
</ul>
<p>The bend test is your friend: pick up the rack with tongs at the center point. If the meat cracks on the surface but does not break in half, you are in the zone. If it flops limply, keep cooking. If it breaks apart, you went too far. With practice, you will nail the timing by feel.</p>`
  },

  // --- CHIMICHURRI STEAK ---
  'caaovn2xyr6o4r2kjd4brb3m': {
    excerpt: "The simplest and most satisfying thing you can do with a thick steak and a bag of charcoal. Salt, fire, chimichurri. If Argentina got one thing right, it is this.",
    editorial_intro: `<h2>Sometimes Less Is Everything</h2>
<p>I spend most of my time on this site talking about 14-hour briskets and carefully managed fires. But the best meal I cooked last month was this: a bone-in ribeye, coarse salt, screaming hot charcoal, and a bowl of chimichurri made twenty minutes before dinner. Total active cooking time: 8 minutes. Total flavor: off the charts.</p>
<p>This is the Argentine approach to grilling, and it has more to teach American backyard cooks than any competition BBQ technique. Stop over-seasoning. Stop marinating overnight. Stop glazing and saucing and fussing. Buy a great steak, light a hot fire, season with salt, cook it fast, and let a fresh herb sauce do the talking.</p>

<h3>What Can Go Wrong</h3>
<ul>
<li><strong>Gray, Crustless Steak:</strong> Your fire was not hot enough. You need 600°F+ at the grate surface, which means a full chimney of lit charcoal piled tight. If you cannot hold your hand 4 inches above the grate for more than 2 seconds, you are in the zone.</li>
<li><strong>Overcooked Interior:</strong> You used steaks thinner than 1.25 inches. Thin steaks overcook before the crust develops. Go 1.5 inches minimum for this technique.</li>
<li><strong>Flabby, Wet Chimichurri:</strong> Too much oil, not enough acid. The vinegar should be assertive — you want a bright, punchy sauce that cuts through the richness of the beef, not an herbed olive oil.</li>
<li><strong>Raw Center:</strong> If the crust is perfect but the center is too rare, move the steak to the indirect zone and let it coast up 10-15°F with the lid closed. Never turn down the heat on the direct side — you need that inferno for the next steak.</li>
</ul>
<p>Make the chimichurri at least 30 minutes ahead, ideally 2-4 hours. The flavors meld and intensify as it sits. Do not refrigerate it right before serving — cold chimichurri on a hot steak is a crime against temperature.</p>`
  },

  // --- SMOKED MAC AND CHEESE ---
  'netj0s6fs78c4rgjk3ru6xeu': {
    excerpt: "The side dish that regularly outshines the main event. Creamy, smoky, with a crunchy golden crust that makes people ask for the recipe before they have finished their first helping.",
    editorial_intro: `<h2>The Side Dish Nobody Saves Room For (But Should)</h2>
<p>I have served this smoked mac and cheese alongside $80 briskets, and I have watched guests go back for seconds of the mac while the brisket sat lonely on the cutting board. That tells you everything you need to know about this recipe.</p>
<p>The trick is simple: take an already-great stovetop mac and cheese, pour it into a disposable aluminum pan, and let it sit in the smoker for 90 minutes alongside whatever protein you are cooking. The thin aluminum lets smoke penetrate better than cast iron, and the final 30 minutes uncovered with breadcrumbs creates a golden crust that shatters when you hit it with a spoon.</p>

<h3>What Can Go Wrong</h3>
<ul>
<li><strong>Grainy Sauce:</strong> You heated the cheese too aggressively. Remove the pot from heat BEFORE adding the shredded cheese, and stir gently. High heat causes the proteins in cheese to seize and separate. Gentle is the key word.</li>
<li><strong>Dried Out:</strong> You smoked it too long or at too high a temperature. This is a 225-275°F side dish that needs 90 minutes total, not 2 hours. If your smoker is running at 300°F for a chicken cook, pull the mac 15 minutes early.</li>
<li><strong>Too Smoky:</strong> Possible if you are using mesquite or heavy hickory. Stick with fruit woods (cherry, apple) or a mild hardwood (oak) for smoked mac. You want a whisper of smoke, not a shout.</li>
<li><strong>Mushy Pasta:</strong> You cooked the macaroni fully on the stove before smoking it. Boil it 2 minutes UNDER the package directions — it will finish cooking in the smoker. Al dente going in, perfect coming out.</li>
</ul>
<p>This recipe is designed to share smoker space with whatever you are cooking. Slide it onto an empty shelf 90 minutes before serving time and forget about it until the timer goes off. Scales easily — use a bigger pan and add 15-20 minutes for larger batches.</p>`
  },
};

// ============================================================================
// CONTENUTI TUTORIAL — Voce del Pitmaster
// ============================================================================

const tutorialUpdates = {
  // --- TEMPERATURE CONTROL ---
  'etqhezfpq3cya4m134forlc6': {
    excerpt: "If you cannot control temperature, you cannot cook. Period. This guide teaches you the only skill that actually matters on a charcoal grill — everything else is decoration.",
    content: `<h2>The Only Skill That Matters</h2>
<p>I have been teaching people to grill for two decades, and I can tell you that 90% of bad BBQ comes from exactly one problem: temperature control. Not bad rubs. Not cheap meat. Not the wrong wood. Temperature. If you can hold 250°F for 12 hours on a charcoal grill, you can produce world-class BBQ. If you cannot, the most expensive rub and the highest-grade brisket in the world will not save you.</p>
<p>Here is the good news: temperature control on a charcoal grill is not complicated. It is a learned skill, like riding a bike. Frustrating at first, intuitive after practice, and automatic once it clicks. This guide gives you the framework. Your grill gives you the practice.</p>

<h2>The Fire Triangle: Oxygen Is Your Only Lever</h2>
<p>Every fire needs fuel (charcoal), oxygen (air), and heat (ignition). You cannot change the fuel mid-cook (not easily), and heat is a result, not an input. That leaves oxygen — controlled by your vents — as the only lever you have. More air = more combustion = more heat. Less air = less combustion = less heat. Everything else is a footnote to this principle.</p>
<p>Your grill has two vent systems: bottom intake vents (control how much fresh air feeds the fire) and a top exhaust vent (controls how quickly hot air and smoke exit). Together, they create a draft that flows through the cooking chamber. The bottom vent is your gas pedal. The top vent is your fine-tuning dial.</p>

<h3>The Rule That Will Save Your Food: Never Fully Close the Top Vent</h3>
<p>I see beginners do this constantly: temperature is too high, so they slam both vents shut. The fire smothers, produces thick, acrid white smoke, and coats the food with creosote — a bitter, oily compound that tastes like licking an ashtray. Always leave the top vent at least 25% open. If you need to reduce temperature, close the BOTTOM vent first and leave the top vent cracked. This reduces fuel to the fire while allowing clean exhaust to escape.</p>

<h2>The #1 Beginner Mistake: Chasing the Temperature</h2>
<p>Charcoal has thermal inertia — it takes time to respond to vent changes. If your grill is at 300°F and climbing, closing the vents will NOT produce an instant drop. The coals have momentum. They are still burning at the same rate and will continue for 15-20 minutes before the reduced airflow takes effect. By then, you have probably panicked and opened the vents again, starting the cycle over.</p>
<p>The fix: make SMALL adjustments and WAIT. Move a vent 1/4 inch and wait 10-15 minutes. Check the temp. If it is still moving in the wrong direction, adjust another 1/4 inch and wait again. Patience is the entire game. The guys who win at temperature control are the ones who resist the urge to fiddle constantly.</p>

<h2>Vent Positions: A Starting Point (Not a Bible)</h2>
<p>Every grill is different. Your Weber Kettle behaves differently from mine because of gasket seal, charcoal type, ambient temp, wind, and a dozen other variables. These positions are starting points for a standard 22-inch kettle:</p>
<ul>
<li><strong>225-250°F (Low and Slow):</strong> Bottom vent open 1/4 inch. Top vent open 25-50%. This is brisket, pork shoulder, and rib territory. You are barely feeding the fire.</li>
<li><strong>275-325°F (Hot Smoking):</strong> Bottom vent open 1/2 inch. Top vent halfway. Faster smoking for chicken, turkey, and hot-and-fast techniques.</li>
<li><strong>350-400°F (Indirect Roasting):</strong> Bottom vent open 3/4. Top vent 3/4. Good for spatchcocked chicken, whole turkeys, and indirect-heat roasting.</li>
<li><strong>450-500°F (Direct Grilling):</strong> Bottom vent fully open. Top vent 3/4 open. Standard grilling heat for steaks, burgers, chops, and vegetables.</li>
<li><strong>600°F+ (Searing):</strong> Both vents wide open. Remove the lid if needed. Maximum airflow, maximum heat. Short-duration searing only.</li>
</ul>
<p>Write down the vent positions that work for YOUR grill at each temperature range. After 5-6 cooks, you will have a personal reference chart that is more accurate than anything I can publish.</p>

<h2>The Minion Method: Your Best Friend for Long Cooks</h2>
<p>For cooks longer than 4 hours at 225-275°F, the Minion Method is the most reliable technique that exists. The concept: fill your charcoal chamber with UNLIT charcoal, then add a small amount of FULLY LIT coals on top. The lit coals gradually ignite the unlit ones beneath them, producing a slow, steady, controlled burn that can last 8-16 hours without adding fuel.</p>
<p>On a Weber Kettle: fill a charcoal basket or one side of the grate with unlit briquettes. Light 12-15 briquettes in a chimney until they are fully ashed over (gray all the way through, about 15 minutes). Place the lit briquettes on top of the unlit pile. Add 2-3 fist-sized wood chunks for smoke. Set your vents for 225-250°F and wait 20-30 minutes for the temperature to stabilize before adding food.</p>
<p>Common Minion Method mistake: lighting too many briquettes initially. If you start with 20+ lit briquettes, the temperature will overshoot and take an hour to come down. Start with fewer and add a few lit ones if the temperature is not reaching your target after 30 minutes.</p>

<h2>The Snake Method: An Alternative for Kettle Grills</h2>
<p>Arrange unlit briquettes in a C-shaped row, two briquettes wide and two high, around the inside perimeter of your kettle's charcoal grate. Place wood chunks every 6 inches along the snake. Light 5-6 briquettes in a chimney and place them at one end of the C. The fire slowly burns along the snake like a fuse, giving you 6-8 hours of steady heat at 225-250°F. This method is dead simple and great for beginners, but it offers less flexibility than the Minion method if you need to adjust temperature significantly mid-cook.</p>

<h2>Dealing with Temperature Spikes</h2>
<p>It will happen. You will open the lid to check your food, oxygen floods in, and the temperature rockets up 50°F. Do not panic.</p>
<ul>
<li>Close the bottom vent to 1/8 inch open.</li>
<li>Leave the top vent at least 25% open (never fully close it).</li>
<li>Wait 15-20 minutes. The temperature will gradually come down as the reduced airflow takes effect.</li>
<li>If you need a faster drop, open the lid for 5-10 seconds — counterintuitive, but it vents trapped heat. Close the lid, adjust vents, and wait.</li>
</ul>
<p>What you should NOT do: fully close all vents. This smothers the fire, causes smoldering, and produces bitter smoke that ruins your food. A slow fire producing dirty smoke is worse than a slightly-too-hot fire producing clean heat.</p>

<h2>Fuel Choice: Briquettes vs. Lump</h2>
<p>For temperature control, briquettes are easier for beginners. They burn more consistently, respond more predictably to vent changes, and produce a steadier heat output. Kingsford Original is fine. Do not overthink this.</p>
<p>Lump charcoal burns hotter, responds faster to vent adjustments, and produces less ash. But it also burns less uniformly — you get hot spots and cool spots as different-sized pieces ignite at different rates. Experienced cooks who understand their specific grill often prefer lump. Beginners should start with briquettes.</p>
<p>One absolute rule: NEVER use self-lighting charcoal (the kind soaked in lighter fluid). The chemical taste persists through the entire cook and contaminates your food. Use a chimney starter. Always. No exceptions.</p>

<h2>Two-Zone Fire: Your Insurance Policy</h2>
<p>Always — and I mean always — set up your charcoal grill with a two-zone fire. Coals on one side, empty on the other. This gives you a hot zone for searing and a cool zone for indirect cooking. If something is cooking too fast, slide it to the cool side. If it needs more color, move it over the coals. Two-zone cooking is the most practical safety net in charcoal grilling, and there is never a reason not to use it.</p>
<p>Even when you think you want all-over high heat (grilling burgers, for example), a two-zone setup protects you. When a burger drips fat onto the coals and causes a flare-up, you have somewhere to move it. Without a cool zone, your only option is watching it burn.</p>

<h2>The Real Secret: Stop Reading and Go Cook</h2>
<p>I can write 5,000 words about temperature control, and none of it substitutes for lighting 20 fires on your specific grill. Start simple: buy a whole chicken, spatchcock it, and try to hold 350°F for 90 minutes. Note your vent positions. Note what happens when you open the lid. Note how long it takes your grill to recover. Do this five times and you will have better temperature intuition than 80% of people who call themselves grillers. The grill is the teacher. This guide is just the syllabus.</p>`
  },

  // --- CHOOSING YOUR FIRST SMOKER ---
  'r6zm65se51etdnccaobquo0p': {
    excerpt: "Stop agonizing, stop watching YouTube comparisons for the twentieth time, and stop asking Reddit. I am going to tell you exactly what to buy based on who you actually are.",
    content: `<h2>You Are Overthinking This</h2>
<p>I get this question more than any other: "What smoker should I buy?" And the person asking has usually spent three weeks watching YouTube videos, reading forums, and getting more confused with every source. The offset guys say offsets are the only real smokers. The pellet grill guys say pellets are the future. The kamado cult insists ceramic is king. Everyone is right about their own cooker and wrong about everyone else's.</p>
<p>Here is the truth that nobody making "Top 10 Smokers" videos wants to admit: any smoker in any category can produce excellent food if you learn to use it. The best smoker is the one you will actually use every weekend. That is it. Full stop.</p>
<p>Now let me help you figure out which one that is.</p>

<h2>Answer These Questions Honestly</h2>
<p>Before you look at a single product, answer these five questions. Be honest with yourself — aspirational answers lead to expensive regret.</p>
<ul>
<li><strong>How hands-on do you want to be?</strong> Be honest. If you are the type who sets a timer and walks away from the oven, you want a pellet grill. If you enjoy tending a fire like a hobby, you want charcoal. If the idea of waking up at 3 AM to add a log excites you rather than horrifies you, you want an offset.</li>
<li><strong>What is your REAL budget?</strong> Not the number you told your spouse. The total amount including accessories, fuel, a cover, and a decent thermometer. Add 30% to the grill price — that is your true cost of entry.</li>
<li><strong>How much space do you have?</strong> A full-size offset needs a 6-foot-wide dedicated area. A kamado fits on a 3-foot balcony. A pellet grill needs an outlet within 10 feet.</li>
<li><strong>How many people do you feed?</strong> Family of 4? Nearly anything works. Regular parties of 20? You need serious cooking capacity — 800+ square inches.</li>
<li><strong>Do you also want to grill?</strong> Not all smokers are also grills. An offset is smoking-only for practical purposes. A kamado does everything. A pellet grill grills adequately but not exceptionally.</li>
</ul>

<h2>The Options, Honestly Assessed</h2>

<h3>Offset Smokers (Stick Burners): The Romantic Choice</h3>
<p>An offset has a horizontal cooking chamber with a firebox bolted to one side. You burn real wood, manage a real fire, and produce the deepest smoke flavor possible. Texas BBQ joints use offsets. Competition pitmasters use offsets. If authenticity and maximum flavor depth are your priorities, nothing else comes close.</p>
<p><strong>The reality check:</strong> A quality offset starts at $800 and a genuinely good one costs $1,500-3,000 (Lone Star Grillz, Workhorse Pits, Yoder). Cheap offsets under $500 (like the Char-Broil Oklahoma Joe Highland) have thin steel that leaks air from every seam, making temperature control a constant battle. You will need to add fire every 30-45 minutes. You will need to learn fire management from scratch. Your first dozen cooks will require constant attention. An overnight brisket cook means setting alarms every hour.</p>
<p><strong>Buy if:</strong> You want the deepest smoke flavor possible and you view fire management as a hobby, not a chore. You have $1,500+ for a quality unit. You have outdoor space away from the house (offsets smoke a LOT).</p>
<p><strong>Skip if:</strong> You want easy, you want consistent, or you think "set it and forget it" is a reasonable expectation.</p>

<h3>Pellet Smokers: The Easy Button</h3>
<p>An electric auger feeds compressed wood pellets into a firepot. A digital controller maintains your set temperature automatically. You push a button (or tap your phone) and walk away. The Traeger Ironwood, Camp Chef Woodwind, and RecTeq Bull are the current leaders.</p>
<p><strong>The reality check:</strong> Smoke flavor is lighter than charcoal or wood — noticeably lighter. Maximum temperature is usually 450-500°F, which means mediocre searing. You need a power outlet. The auger, fan, and controller are mechanical parts that WILL fail eventually. Pellets cost $1/lb and a long cook burns 15-30 lbs. The true cost of ownership over 5 years is $2,000-4,000 on top of the purchase price.</p>
<p><strong>Buy if:</strong> You value convenience above all else. You want consistent results from day one. You are a busy parent who cannot babysit a fire. You are not chasing competition-level smoke depth.</p>
<p><strong>Skip if:</strong> You want maximum smoke flavor. You want to learn real fire management. You are uncomfortable with app-dependent electronics. You do not have a power outlet outdoors.</p>

<h3>Kamado Cookers: The Do-Everything Choice</h3>
<p>Thick ceramic walls, lump charcoal fuel, and incredible insulation make the kamado (Kamado Joe, Big Green Egg, Char-Griller Akorn) the most versatile cooker type. Smokes at 225°F, sears at 750°F, bakes pizza, roasts chicken. Fuel efficiency is absurd — 4 lbs of charcoal for a 12-hour cook.</p>
<p><strong>The reality check:</strong> They are heavy (200-350 lbs), expensive ($1,200-3,500), and have a real learning curve for vent management. The ceramic can crack from thermal shock. Cooking area is limited (the most popular size gives you about 400 sq in — enough for a family, tight for a party). You need to understand charcoal and airflow, which takes 10-15 cooks to internalize.</p>
<p><strong>Buy if:</strong> You want one cooker that genuinely does everything. You enjoy learning a craft. You have limited space. You cook for 2-8 people. You plan to keep this cooker for 10+ years.</p>
<p><strong>Skip if:</strong> You cook for large groups regularly. You want zero learning curve. You cannot physically manage the weight. You are not committed to using it weekly.</p>

<h3>Weber Kettle: The Budget Champion</h3>
<p>The 22-inch Weber Original Kettle Premium costs $165. Add a Slow 'N Sear insert ($100), a decent thermometer ($25-105), and a chimney starter ($15), and for $305-385 total you have a setup that grills beautifully, smokes competently, and teaches you every fundamental of charcoal cooking.</p>
<p><strong>The reality check:</strong> It is small, it needs refueling on long cooks, and it is not as well-insulated as a kamado. But it is the best value in outdoor cooking and the best teaching tool ever made. Every skill you learn on a kettle transfers to any future cooker.</p>
<p><strong>Buy if:</strong> You are budget-conscious, new to charcoal, or want a versatile first cooker that does not lock you into one style.</p>
<p><strong>Skip if:</strong> You want zero-effort long smoking sessions or you only want to smoke (not grill).</p>

<h3>Electric Smokers: The Apartment Dweller's Option</h3>
<p>A heating element and a wood chip tray in an insulated box. Plug it in, set the temp, add chips every hour. The Masterbuilt 30-inch Digital is the category standard at $200-300.</p>
<p><strong>The reality check:</strong> The lightest smoke flavor of any option. No real searing capability. The food is good, not great. It feels like using an appliance rather than cooking with fire. But it is cheap, easy, and allowed in apartments where open-flame grills are prohibited.</p>
<p><strong>Buy if:</strong> You live in an apartment, have no outdoor space, and want to try smoking with minimal investment.</p>
<p><strong>Skip if:</strong> You have any other option available to you.</p>

<h2>My Direct Recommendations</h2>
<p><strong>Best first smoker under $400:</strong> Weber Kettle 22" + Slow 'N Sear insert. Learn charcoal, learn fire, learn smoking. Graduate to whatever calls to you in a year.</p>
<p><strong>Best first smoker under $1,500:</strong> Kamado Joe Classic III. Does everything, lasts forever, teaches you real fire management.</p>
<p><strong>Best first smoker for zero learning curve:</strong> Camp Chef Woodwind 24 or Traeger Ironwood 885. Set temp, walk away, eat great food.</p>
<p><strong>Best first smoker for maximum flavor:</strong> Save until you can afford a Lone Star Grillz 20x40 offset or a Workhorse 1975. Accept the learning curve. Produce BBQ that pellet grill owners can only dream about.</p>

<h2>Final Word</h2>
<p>The best smoker is the one you use every weekend. Not the one with the best reviews, not the one your favorite YouTuber endorses, not the one on sale at Costco. Buy something you are excited about, cook on it relentlessly, and stop second-guessing your choice. Every smoker can produce food that makes people shut up and eat. The variable is you, not the equipment.</p>`
  },

  // --- WOOD TYPES FOR SMOKING ---
  'ax6l7plbxc9ks2a570oqy2om': {
    excerpt: "Wood is the seasoning of BBQ. Using the wrong wood — or burning it wrong — will ruin a cook faster than any other mistake. Here is what 20 years of burning wood has taught me.",
    content: `<h2>Wood Selection Is Not a Suggestion — It Is a Requirement</h2>
<p>Every week, someone posts on a BBQ forum asking why their smoked chicken tastes bitter. Nine times out of ten, the answer is one of two things: they used too much hickory, or their fire was smoldering instead of burning clean. Wood selection and combustion quality are the two most under-discussed skills in BBQ, and getting either one wrong will ruin a cook more reliably than any other mistake you can make.</p>
<p>I have burned every commercially available smoking wood over the past 20 years. I have over-smoked briskets with mesquite, under-smoked chicken with apple, and found the sweet spots for every protein I regularly cook. This guide is the distilled version of those lessons.</p>

<h2>The Major Woods, Ranked by Intensity</h2>

<h3>Mesquite: The Nuclear Option (Intensity: 10/10)</h3>
<p>Mesquite is the most polarizing wood in BBQ. In Texas and the Southwest, it is used for GRILLING — short, high-heat exposure that gives beef a distinctive earthy char. It is fantastic for that purpose. A mesquite-grilled ribeye is one of the great eating experiences.</p>
<p>But for smoking — low and slow, hours of exposure — mesquite is a disaster waiting to happen. The smoke is so aggressive that anything beyond 2 hours of exposure starts tasting bitter and medicinal. I have ruined more than one pork shoulder by thinking "I will just use mesquite for the whole cook." Do not repeat my mistakes.</p>
<p><strong>Use for:</strong> Direct grilling only. Steaks, fajitas, vegetables, anything with less than 30 minutes of smoke exposure.</p>
<p><strong>Never use for:</strong> Low-and-slow smoking. Period. Unless blended at 10% mesquite / 90% oak, and even then, proceed with caution.</p>

<h3>Hickory: The American Standard (Intensity: 8/10)</h3>
<p>Hickory is the most popular smoking wood in the country, and it has earned that position. The flavor is bold, assertive, and bacon-like — it is the taste most Americans associate with "smoked meat." With pork ribs, shoulders, and bacon, hickory is magnificent.</p>
<p>But hickory is also the wood that beginners most commonly overdo. Too much hickory smoke — from too many chunks, too long an exposure, or a smoldering fire — turns acrid and unpleasant. On cooks longer than 6-8 hours, I use hickory for the first half only, then switch to a milder wood (cherry or apple) or add no additional wood for the remainder.</p>
<p><strong>Best pairings:</strong> Pork ribs, pork shoulder, bacon, beef brisket, sausages.</p>
<p><strong>Caution:</strong> Use 2-3 fist-sized chunks maximum for a kettle or kamado cook. For an offset, use hickory splits for the first 4-5 hours, then switch to oak.</p>

<h3>Oak: The Professional's Choice (Intensity: 6/10)</h3>
<p>Post oak is what the legendary Texas BBQ joints burn — Franklin, Goldee's, Interstellar, Truth. There is a reason for that: oak produces a clean, medium-intensity smoke with a slightly nutty character that complements beef without competing with it. It is the most forgiving smoking wood available, nearly impossible to over-smoke with, and versatile enough for any protein.</p>
<p>If you are a beginner, buy post oak and use it for everything. Seriously. You can experiment with other woods later, but oak is your safe harbor. It will never let you down.</p>
<p><strong>Best pairings:</strong> Beef brisket (the classic), beef ribs, pork shoulder, lamb, literally anything.</p>
<p><strong>Varieties:</strong> Post oak is the gold standard for BBQ. Red oak is slightly more assertive. White oak is milder. All three work well.</p>

<h3>Pecan: Hickory's Smarter Sibling (Intensity: 5/10)</h3>
<p>Pecan is in the hickory family and delivers a similar flavor profile — but more refined, slightly sweeter, and significantly more forgiving. Where hickory punishes you for using too much, pecan gives you a wider margin of error. It has become the darling of competition BBQ teams in the Southeast, and for good reason.</p>
<p><strong>Best pairings:</strong> Universal — works with everything. Particularly good with pork and poultry.</p>
<p><strong>Pro tip:</strong> If you like the idea of hickory but have been burned (literally) by overdoing it, switch to pecan. You get 80% of the hickory character with almost no risk of bitterness.</p>

<h3>Cherry: The Competition Secret Weapon (Intensity: 4/10)</h3>
<p>Cherry is everywhere in competition BBQ, and the reason is partly flavor and partly cosmetics. Cherry smoke produces a gorgeous deep mahogany color on the meat surface — that dark, lacquered look that makes judges' mouths water before they take a bite. The flavor is mild, sweet, and subtly fruity. Almost impossible to overdo.</p>
<p>Most competition teams use a cherry/hickory blend — the hickory provides smoke depth while the cherry provides color and sweetness. A 50/50 mix is the most common ratio for pork ribs.</p>
<p><strong>Best pairings:</strong> Pork ribs (especially with hickory blend), pork shoulder, chicken, turkey, duck, ham.</p>

<h3>Apple: The Gentle Giant (Intensity: 3/10)</h3>
<p>Apple is the mildest commonly available smoking wood. The smoke is subtle, sweet, and delicate — perfect for proteins where you want a hint of smoke without overwhelming the natural flavor. Chicken, turkey, fish, and light-flavored pork cuts all benefit from apple's gentle touch.</p>
<p>Because the flavor is so mild, you can smoke with apple for the entire duration of a long cook without any risk of over-smoking. This makes it the safest choice for beginners who are worried about overdoing it.</p>
<p><strong>Best pairings:</strong> Chicken, turkey, fish, cheese (cold smoke), pork loin, ham.</p>
<p><strong>Note:</strong> For brisket or beef ribs, apple alone is usually too mild. Blend it 50/50 with oak or hickory for beef.</p>

<h3>Maple: The Underappreciated Professional (Intensity: 3/10)</h3>
<p>Maple — especially sugar maple — produces a light, subtly sweet smoke that pairs beautifully with poultry, pork, and vegetables. It is less common than the woods above but well worth seeking out. The slight sweetness enhances glazed and brined meats particularly well.</p>
<p><strong>Best pairings:</strong> Ham, bacon, poultry, vegetables, cheese.</p>

<h2>Clean Smoke vs. Dirty Smoke: The Critical Distinction</h2>
<p>This matters more than wood selection. I cannot stress this enough. You can use the perfect wood in the perfect quantity and still ruin your food if the smoke is dirty.</p>
<p><strong>Clean smoke</strong> is thin, pale blue or nearly invisible. It smells pleasant — like a campfire you want to sit next to. It contains the desirable flavor compounds (syringol and guaiacol) that give BBQ its characteristic taste.</p>
<p><strong>Dirty smoke</strong> is thick, white, and billowing. It smells acrid and stings your eyes. It contains creosote, acrolein, and other compounds that taste bitter and coat food with a greasy black residue. Dirty smoke comes from incomplete combustion — wood smoldering below 570°F rather than burning above it.</p>
<p>How to ensure clean smoke:</p>
<ul>
<li>Use seasoned (dried) wood with moisture content below 20%. Green or wet wood smolders.</li>
<li>Add wood to an ESTABLISHED HOT FIRE, not a dying one. The wood should ignite within 60 seconds of being placed on the coals.</li>
<li>Do not smother the fire with too much wood at once. Two fist-sized chunks are better than six.</li>
<li>Ensure adequate airflow. Starving the fire of oxygen is the #1 cause of dirty smoke.</li>
<li>If you see thick white smoke pouring from your chimney, something is wrong. Open your intake vent, let the fire breathe, and wait for the smoke to thin out before adding food.</li>
</ul>

<h2>Quick Reference Pairing Chart</h2>
<ul>
<li><strong>Beef brisket:</strong> Post oak (primary choice), hickory, pecan. Mesquite for grilling only.</li>
<li><strong>Beef ribs:</strong> Oak, cherry/oak blend, pecan.</li>
<li><strong>Pork ribs:</strong> Cherry + hickory blend (competition standard), apple, pecan.</li>
<li><strong>Pork shoulder:</strong> Hickory (first 4-5 hours only), cherry, apple, oak.</li>
<li><strong>Chicken:</strong> Apple, cherry, maple, pecan. Avoid hickory unless blended at 25% or less.</li>
<li><strong>Turkey:</strong> Apple, cherry, maple. Very light smoke — these birds dry out before heavy smoke penetrates.</li>
<li><strong>Fish/Seafood:</strong> Alder (the classic pairing for salmon), apple, cherry. Use very light smoke for very short times.</li>
<li><strong>Cheese:</strong> Apple, cherry, maple. COLD SMOKE ONLY — hot smoke melts cheese into a puddle.</li>
<li><strong>Vegetables:</strong> Mesquite (grilled, short exposure), cherry, apple. Smoke penetrates vegetables faster than meat.</li>
</ul>

<h2>The One Rule That Matters</h2>
<p>When in doubt, use less wood. You can always smoke longer or add more wood, but you cannot un-smoke food that has been over-smoked. Start conservative, taste the results, and adjust next time. In 20 years of smoking, I have regretted using too much wood a hundred times. I have regretted using too little exactly zero times.</p>`
  },
};

// ============================================================================
// CONTENUTI BLOG POST — Voce del Pitmaster
// ============================================================================

const blogPostUpdates = {
  // --- BBQ SEASON 2026 TRENDS ---
  'u9nhhsmm1051gspzln5t2h0o': {
    excerpt: "Forget the hype cycle. Here is what is actually changing in BBQ this season, what is marketing noise, and what trends deserve your attention and money.",
    content: `<h2>Most "Trend" Articles Are Just Press Releases. This One Is Not.</h2>
<p>Every spring, the BBQ media publishes "trend" articles that are barely disguised product advertisements. "AI-powered grills are the future!" (Translation: a company sent them a free grill with a Bluetooth thermometer.) "Whole-animal butchery is trending!" (Translation: a Brooklyn cooking school has a new class.) I am going to skip the press-release regurgitation and tell you what is actually happening on the ground in 2026, based on what I see at competitions, in online communities, and in my own backyard.</p>

<h2>1. Smart Temperature Controllers: Useful, Not Revolutionary</h2>
<p>Companies like FireBoard, ThermoWorks, and BBQ Guru are shipping PID fan controllers with machine-learning features that predict temperature fluctuations and adjust fan speed proactively. Does the tech work? Yes — in testing, AI-driven controllers reduced temperature swings by about 30-40% compared to standard PID controllers. That is a real improvement.</p>
<p>But let us be honest about what this means in practice. On a well-built smoker that holds temperature naturally (kamado, insulated cabinet), the improvement is marginal — you are going from ±8°F variance to ±5°F. On a leaky, thin-walled offset, no fan controller is going to fix the fundamental problem of poor build quality. The technology is useful for people who already have decent equipment and want marginal gains. It is not a substitute for learning to manage fire.</p>
<p>Traeger's WiFIRE "Smart Cook" mode is more interesting — it adjusts pellet feed rate based on food probe data, essentially deciding when to ramp temperature during the final phase of a cook. In testing, it produced a more consistent brisket finish than my manual temperature management. But it also requires trusting an algorithm with your $80 piece of meat, which is a bigger psychological leap than Traeger's marketing acknowledges.</p>

<h2>2. The Real Trend: Affordable Quality Keeps Improving</h2>
<p>This is the trend nobody writes articles about because it is not sexy, but it matters more than anything else on this list. The quality of equipment available at the $300-800 price point has improved dramatically over the past three years. The Camp Chef Woodwind 24 ($550) delivers pellet smoking performance that would have cost $1,200 five years ago. The Weber Smokey Mountain 18" ($350) remains the best value in dedicated smoking. The Char-Griller Akorn ($300) gives you 80% of a kamado experience at 20% of a Kamado Joe price.</p>
<p>If you are starting out in 2026, you have never had better options at reasonable prices. The democratization of quality equipment is the most impactful development in BBQ, and it has been happening gradually for years without a single press release.</p>

<h2>3. Competition BBQ Is Evolving (Finally)</h2>
<p>The Kansas City Barbeque Society (KCBS) and other sanctioning bodies are slowly — painfully slowly — recognizing that competition BBQ needs to evolve beyond the sugar-bomb, injectable, presentation-focused judging criteria that have dominated for decades. New categories are emerging for "pitmaster's choice" cooks that prioritize flavor and technique over appearance. International BBQ competitions (especially in Australia and South America) are influencing American competitors to explore bolder, less sweetness-dependent flavor profiles.</p>
<p>On the competition circuit, the biggest practical shift is the rise of charcoal-over-pellet cooking. Five years ago, 60%+ of competition teams ran pellet grills for consistency. Today, that number is trending down as teams recognize that judges — particularly experienced ones — can taste the difference between pellet smoke and stick-burner smoke. The pendulum is swinging back toward craft.</p>

<h2>4. Asian BBQ Crossover: Real and Delicious</h2>
<p>This trend is not just marketing — it is happening in backyards everywhere. Korean galbi, Japanese yakitori, Thai-style grilled chicken, and Indian tandoori-inspired techniques are showing up at American cookouts alongside brisket and ribs. The flavor profiles work because they are rooted in the same fundamental principle: fire + meat + bold seasoning.</p>
<p>The equipment crossover is interesting too. Konro grills (Japanese charcoal grills designed for binchotan) are appearing on American patios. A good konro costs $100-200, runs on regular lump charcoal (binchotan is expensive and unnecessary for home use), and excels at yakitori-style skewer cooking. If you have never cooked chicken thighs on skewers over high-heat charcoal with a tare glaze, you are missing out.</p>

<h2>5. Sustainability: Less Greenwashing, More Substance</h2>
<p>The charcoal industry is finally getting serious about sustainability, driven by consumer demand rather than corporate goodwill. FSC-certified brands like Jealous Devil and FOGO are growing because consumers are asking where their charcoal comes from. Lump charcoal made from invasive species removal (Australian eucalyptus, American mesquite clearing) is emerging as a category that turns an environmental problem into fuel.</p>
<p>On the hardware side, the trend toward insulated cookers (kamados, double-wall pellet smokers) is partly a sustainability story — a Kamado Joe Classic III uses 4 lbs of charcoal for a 12-hour cook versus 10+ lbs on an uninsulated offset. Less fuel burned = less carbon released. The fuel efficiency argument resonates with younger buyers who think about environmental impact alongside cooking performance.</p>

<h2>6. What I Am Ignoring This Year</h2>
<p>Indoor "smart grills" that cost $800 and produce food inferior to a $30 cast iron skillet on your stove. Social media "BBQ hacks" that prioritize visual novelty over flavor. Any product that requires a subscription service. Beer-can chicken — it was debunked years ago, the beer does not actually steam the chicken, and it wastes both a beer and vertical cooking space. And the endless gas vs. charcoal "debate," which was settled decades ago (charcoal wins on flavor, gas wins on convenience, both produce good food, move on).</p>

<h2>What I Am Excited About</h2>
<p>The continued growth of BBQ knowledge-sharing communities. The improvement of affordable equipment. The cross-pollination of global grilling traditions. The younger generation discovering that cooking with fire is fundamentally satisfying in a way that no app or smart device can replicate. BBQ is growing because it taps into something primal, and no amount of technology can automate that feeling. Light a fire this weekend. That is the only trend that matters.</p>`
  },

  // --- 10 CHARCOAL BRANDS TEST ---
  'gcaderlcmvy44819sk7eeu1t': {
    excerpt: "We burned 200 pounds of charcoal in controlled tests so you do not have to. The results will change how you buy fuel — and save you money if you are overpaying for marketing hype.",
    content: `<h2>Your Charcoal Matters More Than Your Rub</h2>
<p>I have watched people spend 45 minutes perfecting a brisket rub and then light whatever bag of charcoal was on sale at Home Depot. That is like carefully selecting wine for a dinner party and then serving it in a Styrofoam cup. Your fuel is the foundation of every cook, and the difference between the best and worst charcoal brands is not subtle — it is massive.</p>
<p>Over three weeks, I burned through 200 pounds of the 10 most popular lump charcoal brands in North America. Controlled conditions, identical equipment, standardized measurements. No sponsors, no free product, no agenda. Just data.</p>

<h2>The Testing Setup</h2>
<p>Three identical Weber Kettle 22-inch grills, each tested with exactly 5 pounds of charcoal, lit in a standard Weber chimney starter for exactly 15 minutes. Each brand ran through the test three times. I measured:</p>
<ul>
<li><strong>Time to 450°F at grate level</strong> — how quickly you can actually start cooking</li>
<li><strong>Peak grate temperature</strong> — maximum heat with all vents wide open</li>
<li><strong>Time above 400°F</strong> — how long it maintains real grilling heat</li>
<li><strong>Total burn duration</strong> — ignition to complete ash</li>
<li><strong>Ash production</strong> — percentage of starting weight that ends up as ash (less = better)</li>
<li><strong>Piece size consistency</strong> — percentage of pieces larger than a golf ball</li>
</ul>
<p>I also grilled identical chicken thighs over each brand for a blind flavor test with four experienced BBQ cooks.</p>

<h2>The Contenders</h2>
<p>All purchased at retail, no donated product:</p>
<ul>
<li>Jealous Devil All-Natural Hardwood ($2.50/lb)</li>
<li>FOGO Premium Hardwood ($2.00/lb)</li>
<li>Kamado Joe Big Block ($1.80/lb)</li>
<li>B&B Oak Lump Charcoal ($1.00/lb)</li>
<li>Royal Oak Lump Charcoal ($0.90/lb)</li>
<li>Rockwood All-Natural Hardwood ($1.50/lb)</li>
<li>Cowboy Brand Hardwood Lump ($0.80/lb)</li>
<li>Harder Charcoal — Australian ($2.80/lb)</li>
<li>Jealous Devil XL Restaurant Grade ($3.00/lb)</li>
<li>Weber Hardwood Lump ($1.40/lb)</li>
</ul>

<h2>Results: The Performance Rankings</h2>

<h3>Burn Time Champion: Jealous Devil</h3>
<p>Not even close. Jealous Devil maintained grilling temperature (above 400°F) for an average of 2 hours 48 minutes from 5 pounds of charcoal. The Quebracho Blanco hardwood is one of the densest woods on the planet, and that density translates directly into endurance. FOGO came second at 2:22, Kamado Joe Big Block at 2:15. At the bottom, Cowboy Brand burned through its load in just 1:18 — less than half the winner's time.</p>
<p>What this means in practice: if you are doing a long grill session for a party (45 minutes of searing, then holding heat for another hour), Jealous Devil gets you through without refueling. Cowboy Brand dies halfway through and you are scrambling to add more charcoal with food on the grate.</p>

<h3>Highest Heat: Harder Charcoal</h3>
<p>The Australian eucalyptus charcoal hit 782°F at the grate — the hottest of any brand tested. For extreme searing applications (you want that 3-second-per-side Maillard crust), Harder is the fuel to beat. But it burns faster than the South American hardwoods, so you are trading duration for peak intensity. Jealous Devil peaked at 725°F, FOGO at 710°F — both more than adequate for serious searing.</p>

<h3>Least Ash: Jealous Devil (Again)</h3>
<p>2.8% ash by weight. That means 97.2% of what you buy converts to heat. FOGO: 3.4%. B&B: 5.8%. Royal Oak: 12.3%. Cowboy: 14.1%.</p>
<p>Why ash matters: excess ash clogs your vents, reduces airflow, and destabilizes temperature control on long cooks. On a kamado — where precise vent management is critical — high-ash charcoal is actively fighting your temperature control. 12% ash production from Royal Oak means 1 in 8 pounds of charcoal you buy is garbage that works against you.</p>

<h3>Best Piece Consistency: Jealous Devil & Kamado Joe (Tie)</h3>
<p>Over 85% of pieces were larger than a golf ball. FOGO: 80%. Rockwood: 75%. Cowboy Brand: 45% — nearly half the bag is dust, small fragments, and useless crumbs that burn hot for 10 minutes and turn to ash. Inconsistent piece size means unpredictable burn behavior. Large uniform pieces = steady, predictable heat.</p>

<h2>The Flavor Test: The Honest Result</h2>
<p>Here is where I have to be honest in a way that might disappoint charcoal enthusiasts: the flavor differences between brands are subtle. In our blind tasting of identically grilled chicken thighs, the panel identified B&B Oak as the cleanest and most neutral (the oak lets the chicken flavor dominate), Jealous Devil as similarly clean with a faint sweetness, and FOGO as slightly more aggressively smoky. Cowboy Brand was the only brand that received negative flavor marks — two panelists noted a faint chemical or "off" taste, likely from inconsistent wood sourcing.</p>
<p>For most backyard cooking, the flavor difference between premium brands is negligible. Where the brands diverge dramatically is in PERFORMANCE — burn time, heat output, ash production, and consistency. Those factors affect your cooking experience, your temperature control, and ultimately the quality of your food through indirect means.</p>

<h2>The Value Analysis: This Is What Actually Matters</h2>
<p>Performance per dollar changes the rankings significantly:</p>
<ul>
<li><strong>B&B Oak Lump:</strong> At $1.00/lb, it delivers solid burn time (1:52 above 400°F), acceptable ash (5.8%), clean flavor, and wide retail availability. It is not the best at anything, but it is good at everything and costs half of what the premium brands charge. Dollar for dollar, this is the best charcoal you can buy.</li>
<li><strong>FOGO Premium:</strong> At $2.00/lb, it offers near-Jealous-Devil performance at 80% of the price. If you want premium quality without the extreme premium price tag, FOGO is the sweet spot.</li>
<li><strong>Jealous Devil:</strong> The undisputed performance king, but at $2.50/lb, you are paying for incremental gains over FOGO. Worth it for kamado owners and serious searing enthusiasts. Hard to justify for casual weekend grilling.</li>
<li><strong>Royal Oak:</strong> Cheap ($0.90/lb) but 12% ash and inconsistent piece sizes make it frustrating to work with. False economy — the poor performance negates the low price.</li>
<li><strong>Cowboy Brand:</strong> Avoid. Worst burn time, worst ash, worst consistency, worst flavor notes. The cheapest charcoal per pound is the most expensive charcoal per useful BTU.</li>
</ul>

<h2>My Buying Recommendations</h2>
<p><strong>For most people:</strong> B&B Oak Lump. $1.00/lb, widely available, performs well, clean flavor. This is what I use 60% of the time.</p>
<p><strong>For kamado owners:</strong> Jealous Devil or FOGO. The low ash and consistent piece size are worth the premium on cookers where vent management is critical.</p>
<p><strong>For searing enthusiasts:</strong> Jealous Devil or Harder Charcoal. Maximum heat, maximum duration above searing temperatures.</p>
<p><strong>For competition:</strong> FOGO Premium or Jealous Devil. Consistency and clean burn are non-negotiable when money is on the line.</p>
<p><strong>Budget pick:</strong> Kingsford Original briquettes. Not a lump charcoal, but at $0.50/lb, it is the most consistent and predictable fuel available. Zero glamour, rock-solid results.</p>

<h2>The Bottom Line</h2>
<p>Your charcoal choices should be based on how you cook, not what a brand's marketing says. The 90-minute burn time gap, 60°F peak temperature gap, and 10% ash production gap between the best and worst brands I tested translate into real differences in your cooking experience. Stop treating charcoal as an afterthought. It is the foundation everything else sits on.</p>`
  },

  // --- HOW WE REVIEW ---
  'bxo15hyc3dndlnwprd0kdtco': {
    excerpt: "We buy our own products, we test them for months, and we publish scores that make some brands uncomfortable. Here is exactly how the sausage gets made — because you deserve to know who is feeding you opinions.",
    content: `<h2>Why You Should Care How We Test</h2>
<p>The internet is drowning in BBQ product reviews written by people who have never lit a fire. Some "reviewer" unboxes a grill, takes photos, cooks one meal, and publishes a 2,000-word verdict the next day. Others simply rewrite the manufacturer's spec sheet, add a few stock photos, and slap a 9/10 score on it because the affiliate commission is juicy. I know this because I have been in this industry for two decades, and I have watched it happen over and over.</p>
<p>We do things differently at BBQ Experience. Not because we are morally superior — because we think you deserve an honest assessment before spending $300 to $3,000 on equipment you will live with for years. Here is exactly how we review products, with no glossing over the uncomfortable parts.</p>

<h2>How We Get Products</h2>
<p>We buy most products at retail with our own money. When we say "we tested the Weber Summit S-470," that means we spent $2,800 of our operating budget on a grill that sits on our test patio. Some manufacturers offer review units, and we accept them when it makes sense — but we always disclose this, and the editorial process is identical regardless of how we acquired the product. The review team does not know whether a product was purchased or provided, and frankly, they do not care.</p>
<p>We have turned down review units from brands that attach conditions — "we would like to approve the review before publication" or "we expect a minimum score of 8." If a brand will not let us publish an honest assessment, we do not review their products. Period.</p>

<h2>Testing: Minimum Standards</h2>
<p>We do not publish first-impression reviews. Every product goes through a minimum testing period:</p>
<ul>
<li><strong>Grills and smokers:</strong> 6-8 weeks, minimum 15 cooking sessions. We test grilling, smoking, roasting, and searing capability. We cook in rain, wind, cold, and heat because real grillers do not cook only on perfect days.</li>
<li><strong>Thermometers:</strong> 4-6 weeks, verified against NIST-traceable reference instruments. We test speed, accuracy, durability, and real-world usability with wet hands, cold weather, and low light.</li>
<li><strong>Accessories and tools:</strong> 4 weeks of real cooking use. Not laboratory conditions — actual BBQ scenarios with grease, heat, and abuse.</li>
<li><strong>Consumables (charcoal, pellets, wood):</strong> Multiple controlled burn tests with standardized methodology, plus real-world cooking evaluation on actual food.</li>
</ul>
<p>We document everything: temperature logs, photos, timestamps, notes on every cook. When I say the Weber Summit's lid thermometer reads 20-30°F high, that is based on 40+ data points over six months, not one test on one afternoon.</p>

<h2>How We Score: The Honest Scale</h2>
<p>Our scoring system uses four sub-scores weighted by importance:</p>
<ul>
<li><strong>Performance (35%):</strong> Does it do what it claims? How well? Compared to what? This carries the most weight because results are why you are buying equipment.</li>
<li><strong>Build Quality (25%):</strong> Materials, construction, durability indicators. Will this thing last 5 years or 15?</li>
<li><strong>Value (20%):</strong> Performance relative to price. A $500 grill that performs like a $1,000 unit scores higher than a $1,000 grill that performs like a $1,000 unit.</li>
<li><strong>Ease of Use (20%):</strong> Assembly, learning curve, daily operation, cleaning.</li>
</ul>
<p>The scale is calibrated so that:</p>
<ul>
<li><strong>5.0</strong> = Average. It works, nothing special.</li>
<li><strong>7.0</strong> = Good. Worth buying for the right person.</li>
<li><strong>8.0</strong> = Excellent. A strong recommendation with minor caveats.</li>
<li><strong>9.0+</strong> = Exceptional. Best in class, very few compromises.</li>
</ul>
<p>We have never given a 10.0 overall score. We probably never will. Perfection does not exist in outdoor cooking equipment — every product has tradeoffs, and our job is to document those tradeoffs honestly, not pretend they do not exist.</p>
<p>Importantly: our average review score is 7.8, not 9.2. We do not grade on a curve that starts at 8. When half the internet rates everything between 8.5 and 9.5, the scores become meaningless. Our 7.5 means something. Our 8.5 means something. And our rare 9.0+ means you should pay serious attention.</p>

<h2>The Writing: Opinions, Not Summaries</h2>
<p>Every review is written by the person who actually tested the product. Not a content writer who interviewed the tester. Not a marketing team that polished the language. The person who spent 6 weeks cooking on the grill is the person who writes the review, with all their opinions, frustrations, and honest assessments intact.</p>
<p>We specifically require every review to include:</p>
<ul>
<li>At least 4 genuine cons — not cosmetic nitpicks, but real problems that affect the ownership experience</li>
<li>A clear statement of who should NOT buy the product</li>
<li>Comparisons to competing products — naming names, not vague references to "similar products"</li>
<li>Specific temperatures, times, and measurements — real data, not marketing claims</li>
</ul>
<p>A review draft gets reviewed by at least one other team member who has also used the product. We specifically check for: unsupported claims, promotional tone, missing information, and whether the score actually matches the content. If a review reads like an 8.5 but the score says 9.2, we fix the score — not the writing.</p>

<h2>Affiliate Links: The Uncomfortable Truth</h2>
<p>Yes, we use affiliate links. When you click a link and buy a product, we earn a small commission. This is how we fund testing — buying $2,800 grills and $105 thermometers on our own dime is expensive. The affiliate revenue keeps the lights on and the grills firing.</p>
<p>But here is the line we draw: affiliate relationships never influence scores. We have published 6.5 scores on products whose affiliate programs we participate in. We have recommended competitor products in reviews when the competitor is a better choice. We have steered readers toward cheaper alternatives when the expensive option does not justify its price. If we ever compromise editorial independence for affiliate revenue, we deserve to lose your trust — and we know it.</p>

<h2>Our Mistakes</h2>
<p>We have gotten things wrong. A 2024 review rated a grill's build quality too high; after 18 months of use, corrosion appeared that our 8-week testing period did not catch. We updated the review with a note and adjusted the score. A 2025 charcoal review did not account for batch variation; a reader pointed out that their bag from the same brand performed significantly worse. We re-tested, confirmed the variation, and added a caveat.</p>
<p>We are not perfect. But we are responsive, transparent about corrections, and committed to getting closer to the truth with every review we publish. Hold us accountable. That is what the comment sections and our email are for.</p>

<h2>The Promise</h2>
<p>We will never publish a review we are not confident in. We will never inflate a score to protect an advertising relationship. We will never pretend a product is better or worse than our testing shows. And we will always tell you who a product is NOT for, because the most useful thing a review can do is save someone from spending money on the wrong equipment. That is the job. Everything else is noise.</p>`
  },
};

// ============================================================================
// Esecuzione principale
// ============================================================================

async function main() {
  console.log('=== BBQ Experience Pitmaster Content Rewrite ===\n');

  let success = 0;
  let failures = 0;

  // --- Aggiornamento Review ---
  console.log('--- UPDATING REVIEWS ---');
  for (const [docId, data] of Object.entries(reviewUpdates)) {
    try {
      const result = await apiRequest('PUT', `reviews/${docId}?locale=en`, { data });
      console.log(`[OK] Review "${result.data?.title || docId}" updated`);
      success++;
    } catch (err) {
      console.error(`[FAIL] Review ${docId}: ${err.message}`);
      failures++;
    }
    await sleep(500);
  }

  // --- Aggiornamento Ricette ---
  console.log('\n--- UPDATING RECIPES ---');
  for (const [docId, data] of Object.entries(recipeUpdates)) {
    try {
      const result = await apiRequest('PUT', `recipes/${docId}?locale=en`, { data });
      console.log(`[OK] Recipe "${result.data?.title || docId}" updated`);
      success++;
    } catch (err) {
      console.error(`[FAIL] Recipe ${docId}: ${err.message}`);
      failures++;
    }
    await sleep(500);
  }

  // --- Aggiornamento Tutorial ---
  console.log('\n--- UPDATING TUTORIALS ---');
  for (const [docId, data] of Object.entries(tutorialUpdates)) {
    try {
      const result = await apiRequest('PUT', `tutorials/${docId}?locale=en`, { data });
      console.log(`[OK] Tutorial "${result.data?.title || docId}" updated`);
      success++;
    } catch (err) {
      console.error(`[FAIL] Tutorial ${docId}: ${err.message}`);
      failures++;
    }
    await sleep(500);
  }

  // --- Aggiornamento Blog Post ---
  console.log('\n--- UPDATING BLOG POSTS ---');
  for (const [docId, data] of Object.entries(blogPostUpdates)) {
    try {
      const result = await apiRequest('PUT', `blog-posts/${docId}?locale=en`, { data });
      console.log(`[OK] Blog Post "${result.data?.title || docId}" updated`);
      success++;
    } catch (err) {
      console.error(`[FAIL] Blog Post ${docId}: ${err.message}`);
      failures++;
    }
    await sleep(500);
  }

  // --- Riepilogo ---
  console.log(`\n=== COMPLETE ===`);
  console.log(`Success: ${success}`);
  console.log(`Failures: ${failures}`);
  console.log(`Total: ${success + failures}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
