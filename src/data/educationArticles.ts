export interface EducationArticle {
  slug: string;
  title: string;
  summary: string;
  category: 'Fundamentals' | 'Compliance' | 'Market';
  readTime: number; // minutes
  content: string; // Plain text with paragraph breaks
}

export const educationArticles: EducationArticle[] = [
  {
    slug: 'what-is-carbon-intensity',
    title: 'What is Carbon Intensity and Why It Matters',
    summary:
      'Carbon Intensity (CI) is the single most important metric in low-carbon fuel markets. Understanding it is essential for pricing, compliance, and procurement.',
    category: 'Fundamentals',
    readTime: 4,
    content: `Carbon Intensity (CI) measures the total greenhouse gas emissions produced per unit of energy delivered, expressed in grams of CO\u2082 equivalent per megajoule (gCO\u2082e/MJ). It is the single most important metric in low-carbon fuel markets because it captures the full climate impact of a fuel in one number. Unlike simple fuel-type labels, CI accounts for every emission from feedstock cultivation or extraction through to final combustion, giving buyers and regulators a standardised way to compare fuels on a level playing field.

CI is derived from a lifecycle assessment (LCA) that follows a well-to-wake methodology. This means every stage is included: growing or sourcing the feedstock, transporting it to a production facility, converting it into fuel, shipping the finished fuel to a bunkering port, and ultimately burning it in a vessel\u2019s engine. Each step contributes emissions, and the sum determines the fuel\u2019s CI score. Two fuels that share the same chemical name can have wildly different CI values depending on where and how they were produced.

This is why CI matters more than a fuel-type label. A bio-methanol produced from natural gas reforming with high upstream emissions might carry a CI of 80 gCO\u2082e/MJ, while a different bio-methanol from sustainably sourced biomass might score 25 gCO\u2082e/MJ. Even conventional fossil fuels like VLSFO sit at 85\u201395 gCO\u2082e/MJ. Bio-fuels typically range from 8 to 65 gCO\u2082e/MJ depending on feedstock and process, while e-fuels produced with renewable electricity can achieve scores as low as 3\u201315 gCO\u2082e/MJ. Knowing the CI tells you what you are actually buying.

CI directly drives pricing in regulated markets. A fuel with a lower CI commands a higher premium because it delivers more compliance value per tonne. Under FuelEU Maritime, ships must meet declining intensity targets starting at 89.34 gCO\u2082e/MJ in 2025. Fuels that help operators meet or beat that target are worth more. Under the EU Emissions Trading System (EU ETS), higher-CI fuels generate more allowance surrender obligations, adding direct cost. The result is a market where CI is not just an environmental metric but a financial one\u2014lower CI means lower total cost of compliance and often a net saving when all regulatory costs are factored in.

Understanding CI is therefore essential for anyone involved in marine fuel procurement. It connects environmental performance to commercial value, links production quality to regulatory compliance, and provides the common language that FuelEU Maritime, EU ETS, and RED III all rely on. Verdaxis displays verified CI values for every fuel lot on the platform, ensuring buyers can compare and procure with confidence.`,
  },
  {
    slug: 'physical-vs-book-and-claim',
    title: 'Physical vs Book & Claim',
    summary:
      'Two fundamentally different ways to transfer environmental value. Understanding the difference is critical for compliance and audit integrity.',
    category: 'Fundamentals',
    readTime: 3,
    content: `When a low-carbon fuel is produced, it carries two forms of value: the physical energy content that powers a vessel, and the environmental attributes\u2014such as carbon intensity, feedstock origin, and sustainability certification\u2014that provide compliance and reputational benefit. In a physical delivery model, both forms of value travel together. The buyer receives the actual fuel and its attributes as a single, inseparable package. Chain-of-custody documentation tracks the fuel from production facility to bunker barge to vessel tank, creating an unbroken audit trail that regulators and auditors can verify end to end.

Book & Claim operates differently. Under this model, environmental attributes are decoupled from the physical fuel and transferred separately, much like Renewable Energy Certificates (RECs) in electricity markets. A producer in one location generates the fuel and registers its attributes in a registry. A buyer in a completely different location purchases those attributes and \u201cclaims\u201d the environmental benefit without ever receiving the physical fuel. The physical fuel may be consumed by someone else entirely, while the buyer burns conventional fossil fuel but holds a certificate saying otherwise.

The risks of Book & Claim are significant and increasingly scrutinised by regulators. Because the attributes travel independently, the potential for double-counting increases\u2014the same environmental benefit could be claimed by both the physical fuel recipient and the certificate buyer if registries are not perfectly synchronised. The audit trail is inherently weaker because there is no physical link between the claimed benefit and the fuel actually burned. Regulatory bodies including the European Commission have signalled growing concern about Book & Claim mechanisms, particularly in the context of FuelEU Maritime where the integrity of reported emissions is tied to real compliance obligations and financial penalties.

Verdaxis supports both physical and Book & Claim transfers but takes a clear position: physical delivery is the default, and every transaction is explicitly labelled with its transfer mechanism. When Book & Claim is used, the platform enforces registry checks, flags the transfer type in all compliance documentation, and ensures that attributes cannot be double-counted across participants. This transparency lets buyers, auditors, and regulators see exactly how environmental value was transferred and make informed decisions accordingly.`,
  },
  {
    slug: 'compliance-vs-credits',
    title: 'Why Compliance is Not the Same as Credits',
    summary:
      'Environmental compliance and voluntary carbon credits serve different purposes and should never be confused. Here\u2019s why the distinction matters.',
    category: 'Compliance',
    readTime: 3,
    content: `Environmental compliance and voluntary carbon credits are frequently discussed in the same breath, but they are fundamentally different instruments serving different purposes. Compliance refers to mandatory regulatory obligations imposed by law. In maritime, this means regulations like FuelEU Maritime (which sets greenhouse gas intensity targets for marine fuels), the EU Emissions Trading System (which requires surrender of emission allowances for CO\u2082 emitted), and RED III (which defines sustainability criteria for renewable fuels). Non-compliance carries legally enforceable financial penalties, potential vessel detentions, and reputational consequences that no amount of voluntary action can offset.

Voluntary carbon credits, by contrast, are instruments purchased on the Voluntary Carbon Market (VCM) from standards like Verra or Gold Standard. They represent emissions reductions or removals from projects such as reforestation, cookstove distribution, or methane capture. Companies buy credits to offset their residual emissions and support climate claims in sustainability reports. While credits play a role in corporate climate strategy, they do not satisfy regulatory compliance obligations. A shipowner cannot surrender Verra credits to meet FuelEU Maritime intensity targets or replace EU ETS allowances with Gold Standard certificates.

Conflating compliance and credits is dangerous for several reasons. First, regulators do not accept voluntary credits as substitutes for mandatory obligations\u2014using them as such leads to financial penalties and potential enforcement action. Second, the reputational risk is severe: stakeholders, investors, and the media increasingly scrutinise greenwashing, and claiming compliance through offsets rather than actual fuel switching invites criticism and legal exposure. Third, from an audit perspective, mixing compliance instruments with voluntary credits creates confusion in reporting, making it harder to demonstrate genuine regulatory adherence.

Verdaxis is built as a compliance-first platform, not a carbon credit marketplace. Every transaction on the platform is tied to real fuel with verified environmental attributes that directly satisfy regulatory requirements. The platform does not trade voluntary carbon credits, does not allow credits to be substituted for compliance-grade fuel attributes, and clearly separates compliance documentation from any voluntary sustainability claims. This ensures that buyers and regulators can trust that what is recorded on Verdaxis reflects genuine, auditable compliance performance.`,
  },
  {
    slug: 'scope-3-claims',
    title: 'How Scope 3 Emissions Are Claimed Safely',
    summary:
      'Scope 3 is where the real emissions impact happens \u2014 and where the greatest risk of incorrect claims lies. Safe claiming requires verified data and chain-of-custody.',
    category: 'Compliance',
    readTime: 5,
    content: `Scope 3 emissions are indirect greenhouse gas emissions that occur across a company\u2019s value chain, both upstream and downstream. For a fuel buyer or ship operator, Scope 3 typically includes the emissions embedded in the fuels they purchase\u2014the well-to-tank portion that covers feedstock production, refining, and transportation before the fuel reaches the vessel. While the combustion of fuel onboard is the operator\u2019s Scope 1 emission, the upstream lifecycle emissions sit in their Scope 3 inventory. For the fuel producer, the buyer\u2019s combustion emissions become their downstream Scope 3. This interconnected nature makes Scope 3 both the largest category of emissions for most companies and the hardest to measure accurately.

The difficulty of Scope 3 reporting stems from its dependence on supplier data. A shipowner\u2019s Scope 3 fuel emissions are only as accurate as the carbon intensity data provided by their fuel supplier, which in turn depends on data from the refinery, the feedstock producer, and the logistics chain. Each handoff introduces potential for error, estimation, or outright misrepresentation. Generic emission factors from industry databases are often used as proxies, but these averages can differ from actual values by 30% or more. When companies report Scope 3 reductions based on switching to low-carbon fuels, they need fuel-specific, verified CI data\u2014not category averages.

Safe Scope 3 claiming requires three things: verified carbon intensity data for the specific fuel lot purchased, a traceable chain of custody from producer to buyer, and assurance that no other party is claiming the same emission reduction. Without verified CI data, the claimed reduction is an estimate at best. Without chain of custody, there is no proof the buyer actually received the low-carbon fuel they are claiming credit for. Without safeguards against double-counting, the same emission reduction could appear in multiple companies\u2019 Scope 3 reports, inflating the apparent climate benefit.

Platforms like Verdaxis play a critical role in making Scope 3 claims defensible. By recording verified CI values at the point of production, tracking fuel through every transfer and delivery, and ensuring that environmental attributes are retired once claimed, Verdaxis creates the data pipeline that connects a producer\u2019s carbon intensity certification to a buyer\u2019s Scope 3 report. Each claim is backed by a specific fuel lot with a specific CI value, purchased through a documented transaction, and recorded in an immutable audit trail.

The pressure to get Scope 3 right is increasing rapidly. The EU\u2019s Corporate Sustainability Reporting Directive (CSRD) requires large companies to report Scope 3 emissions with increasing granularity. The SEC\u2019s climate disclosure rules and the ISSB\u2019s sustainability standards (IFRS S1 and S2) are pushing similar requirements globally. Auditors and investors are no longer satisfied with rough estimates\u2014they want traceable, verifiable data. Companies that build robust Scope 3 reporting infrastructure now will be better positioned for the regulatory landscape ahead, while those relying on generic factors and unverified claims face growing exposure to restatement risk, regulatory penalties, and reputational damage.`,
  },
  {
    slug: 'energy-content-matters',
    title: 'Energy Content Matters: Why $/Tonne Isn\u2019t Enough',
    summary:
      'The maritime industry still prices fuel by weight. But it\u2019s the energy in the fuel that moves the ship. A 7% spread in energy density can mean $50-70k on a single voyage.',
    category: 'Market',
    readTime: 4,
    content: `The maritime fuel market prices almost everything in dollars per metric tonne ($/mt). Bunker brokers quote $/mt, purchase orders specify $/mt, and traders think in $/mt. But ships do not run on weight\u2014they run on energy. The propulsion system converts the chemical energy in the fuel, measured in megajoules (MJ), into mechanical power that turns the propeller. A tonne of fuel with higher energy density delivers more miles of steaming than a tonne of fuel with lower energy density. When you buy fuel by weight but consume it by energy, the price per tonne can be deeply misleading.

The variation in energy density is not trivial. VLSFO, the most commonly used marine fuel, has a specified energy content (net calorific value) that ranges from approximately 40.4 MJ/kg to 43.3 MJ/kg depending on the supplier and refinery source. That is a spread of roughly 7%. Between different suppliers in Singapore alone\u2014the world\u2019s largest bunkering port\u2014energy density can vary by 3\u20135% for fuels that are all sold under the same ISO 8217 specification and at very similar prices per tonne. The buyer who pays the same $/mt for a lower-energy fuel is effectively paying more per unit of useful energy.

The financial impact becomes stark on longer voyages. Consider a Panamax vessel on a 25-day voyage from Singapore to Rotterdam, consuming approximately 35 tonnes of fuel per day. That is 875 tonnes of fuel for the voyage. If the fuel\u2019s energy density is 3% lower than expected, the vessel needs roughly 27 additional tonnes to complete the same voyage\u2014or it arrives with significantly less reserve. At $450/mt, those extra tonnes cost approximately $12,000. But the real cost is higher, because every additional tonne burned also generates additional CO\u2082 emissions.

This is where energy content becomes a compliance issue. Under the EU Emissions Trading System, every tonne of CO\u2082 emitted on voyages to, from, or within the EU requires the surrender of emission allowances, currently priced at approximately \u20AC65\u201380 per tonne of CO\u2082. Burning 27 extra tonnes of VLSFO produces roughly 84 additional tonnes of CO\u2082, adding \u20AC5,500\u20136,700 in EU ETS costs. Under FuelEU Maritime, the vessel\u2019s greenhouse gas intensity is calculated based on total energy consumed\u2014lower energy density means more fuel burned for the same work, which worsens the intensity ratio and can push the vessel closer to non-compliance penalties. When you combine the extra fuel cost, the additional ETS exposure, and the potential FuelEU penalty, the total impact of a 3\u20137% energy density shortfall can reach $50,000\u201370,000 on a single voyage.

Verdaxis addresses this by displaying energy-adjusted pricing alongside the traditional $/mt figure. Every fuel listing shows the price per gigajoule ($/GJ) based on the verified energy content of that specific lot. Buyers can compare fuels not just on headline price but on the actual cost of propulsion energy, factoring in the compliance costs that come with higher consumption. This makes it possible to identify fuels that appear cheap per tonne but are expensive per unit of energy delivered\u2014and to make procurement decisions that optimise total voyage cost, not just the bunker invoice.`,
  },
  {
    slug: 'fueleu-maritime-guide',
    title: 'FuelEU Maritime: What Fuel Buyers Need to Know',
    summary:
      'FuelEU Maritime is the EU\u2019s regulation on the greenhouse gas intensity of marine fuels. It takes effect in 2025 and will reshape fuel procurement for every vessel calling at EU ports.',
    category: 'Compliance',
    readTime: 5,
    content: `FuelEU Maritime is a European Union regulation that sets mandatory limits on the greenhouse gas (GHG) intensity of energy used onboard ships calling at EU ports. It is part of the EU\u2019s Fit for 55 legislative package and represents the first regulation anywhere in the world that directly targets the carbon intensity of marine fuels rather than just operational efficiency or total emissions. The regulation applies to all vessels above 5,000 gross tonnage on voyages to, from, and between EU ports, regardless of the flag they fly or the nationality of their owner.

The regulation establishes a reference GHG intensity value of 91.16 gCO\u2082e/MJ and requires progressive reductions from that baseline. In 2025, the maximum allowable intensity is 89.34 gCO\u2082e/MJ\u2014a 2% reduction. This tightens to 6% by 2030, 14.5% by 2035, 31% by 2040, 62% by 2045, and 80% by 2050. These targets are deliberately designed to start gently and then accelerate, giving the industry time to develop supply chains for low-carbon fuels while making clear that the long-term trajectory requires a fundamental shift away from fossil fuels.

Compliance is assessed annually based on the energy-weighted average GHG intensity of all fuels used by a vessel during the reporting period. This means a ship can use a mix of conventional and low-carbon fuels and still comply, as long as the blended average meets the target. The GHG intensity calculation follows a well-to-wake methodology, covering upstream emissions (production, processing, transport) and downstream emissions (combustion). This lifecycle approach means that the feedstock origin and production process matter as much as the fuel chemistry itself.

Non-compliance results in financial penalties. If a vessel exceeds the allowable GHG intensity, the company must pay a penalty proportional to the amount of non-compliant energy used. The penalty is calculated based on the difference between the vessel\u2019s actual intensity and the target, multiplied by the total energy consumed, and converted to a monetary amount. Persistent non-compliance over multiple years triggers escalating penalties and, ultimately, potential expulsion from EU ports. These penalties are designed to make compliance economically rational\u2014it should always be cheaper to use lower-carbon fuel than to pay the fine.

Companies can pool vessels to achieve compliance collectively, averaging the GHG intensity across their fleet. This means a company with some vessels using LNG or biofuels can offset others still running on conventional fuel oil, as long as the fleet average meets the target. Pooling can also occur between different companies through commercial agreements, creating a market mechanism where vessels with surplus compliance can effectively sell their overcompliance to vessels that are short. For fuel buyers, the practical implication is clear: FuelEU Maritime must now be factored into every procurement decision. The cheapest fuel per tonne may be the most expensive fuel when compliance costs are included. Tools like the Verdaxis energy calculator help buyers model the total cost of different fuel options, including FuelEU exposure, so they can make procurement decisions that optimise for total cost rather than headline price.`,
  },
];
