/**
 * Deterministic dummy-data generator.
 * Run:  node src/utils/dummyDataGenerator.js
 * Writes JSON files into src/data/ (run: npm run data). Seeded so every run yields identical data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../src/data');

// ---------- seeded RNG ----------
let seed = 20260918;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const ri = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const rf = (min, max) => rand() * (max - min) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const L = 1e5, CR = 1e7;

const NOW = new Date('2026-09-18T11:30:00+05:30');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600 * 1000).toISOString();
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400 * 1000).toISOString();

// ---------- geography ----------
const regions = [
  { id: 'north', name: 'North Region', head: 'Vikram Malhotra', stateIds: ['DL', 'UP', 'BR', 'JH', 'MP', 'RJ', 'UK', 'PB'] },
  { id: 'south', name: 'South Region', head: 'Lakshmi Narayanan', stateIds: ['TN', 'KA', 'KL', 'AP', 'TS'] },
  { id: 'west', name: 'West Region', head: 'Rohan Deshmukh', stateIds: ['MH', 'GJ', 'GA'] },
  { id: 'east', name: 'East Region', head: 'Sourav Banerjee', stateIds: ['WB', 'OD', 'AS'] },
];

const states = [
  { id: 'DL', name: 'Delhi NCR', mapName: 'Delhi', regionId: 'north', head: 'Aarti Khanna' },
  { id: 'UP', name: 'Uttar Pradesh', mapName: 'Uttar Pradesh', regionId: 'north', head: 'Sanjay Dubey' },
  { id: 'BR', name: 'Bihar', mapName: 'Bihar', regionId: 'north', head: 'Rakesh Pandey' },
  { id: 'JH', name: 'Jharkhand', mapName: 'Jharkhand', regionId: 'north', head: 'Anita Das' },
  { id: 'MP', name: 'Madhya Pradesh', mapName: 'Madhya Pradesh', regionId: 'north', head: 'Manoj Tiwari' },
  { id: 'RJ', name: 'Rajasthan', mapName: 'Rajasthan', regionId: 'north', head: 'Ritu Agarwal' },
  { id: 'UK', name: 'Uttarakhand', mapName: 'Uttarakhand', regionId: 'north', head: 'Deepak Rawat' },
  { id: 'PB', name: 'Punjab', mapName: 'Punjab', regionId: 'north', head: 'Harpreet Kaur' },
  { id: 'TN', name: 'Tamil Nadu', mapName: 'Tamil Nadu', regionId: 'south', head: 'Karthik Subramanian' },
  { id: 'KA', name: 'Karnataka', mapName: 'Karnataka', regionId: 'south', head: 'Deepika Rao' },
  { id: 'KL', name: 'Kerala', mapName: 'Kerala', regionId: 'south', head: 'Arun Nair' },
  { id: 'AP', name: 'Andhra Pradesh', mapName: 'Andhra Pradesh', regionId: 'south', head: 'Pooja Reddy' },
  { id: 'TS', name: 'Telangana', mapName: 'Telangana', regionId: 'south', head: 'Srinivas Rao' },
  { id: 'MH', name: 'Maharashtra', mapName: 'Maharashtra', regionId: 'west', head: 'Amit Patel' },
  { id: 'GJ', name: 'Gujarat', mapName: 'Gujarat', regionId: 'west', head: 'Hetal Shah' },
  { id: 'GA', name: 'Goa', mapName: 'Goa', regionId: 'west', head: 'Neha Joshi' },
  { id: 'WB', name: 'West Bengal', mapName: 'West Bengal', regionId: 'east', head: 'Priya Sharma' },
  { id: 'OD', name: 'Odisha', mapName: 'Odisha', regionId: 'east', head: 'Suresh Yadav' },
  { id: 'AS', name: 'Assam', mapName: 'Assam', regionId: 'east', head: 'Kavita Mishra' },
];

const branchSeeds = [
  ['Patna Main', 'Patna', 'BR', 25.6093, 85.1376], ['Patna South', 'Patna', 'BR', 25.5800, 85.1200],
  ['Muzaffarpur', 'Muzaffarpur', 'BR', 26.1209, 85.3647], ['Gaya', 'Gaya', 'BR', 24.7955, 85.0002],
  ['Lucknow Main', 'Lucknow', 'UP', 26.8467, 80.9462], ['Lucknow South', 'Lucknow', 'UP', 26.8100, 80.9600],
  ['Kanpur', 'Kanpur', 'UP', 26.4499, 80.3319], ['Varanasi', 'Varanasi', 'UP', 25.3176, 82.9739], ['Agra', 'Agra', 'UP', 27.1767, 78.0081],
  ['Delhi Connaught Place', 'New Delhi', 'DL', 28.6315, 77.2167], ['Gurugram', 'Gurugram', 'DL', 28.4595, 77.0266], ['Noida', 'Noida', 'DL', 28.5355, 77.3910],
  ['Ranchi', 'Ranchi', 'JH', 23.3441, 85.3096], ['Jamshedpur', 'Jamshedpur', 'JH', 22.8046, 86.2029],
  ['Indore', 'Indore', 'MP', 22.7196, 75.8577], ['Bhopal', 'Bhopal', 'MP', 23.2599, 77.4126],
  ['Jaipur', 'Jaipur', 'RJ', 26.9124, 75.7873], ['Jodhpur', 'Jodhpur', 'RJ', 26.2389, 73.0243],
  ['Dehradun', 'Dehradun', 'UK', 30.3165, 78.0322], ['Chandigarh', 'Chandigarh', 'PB', 30.7333, 76.7794],
  ['Chennai', 'Chennai', 'TN', 13.0827, 80.2707], ['Coimbatore', 'Coimbatore', 'TN', 11.0168, 76.9558], ['Madurai', 'Madurai', 'TN', 9.9252, 78.1198],
  ['Bengaluru', 'Bengaluru', 'KA', 12.9716, 77.5946], ['Mysuru', 'Mysuru', 'KA', 12.2958, 76.6394],
  ['Thiruvananthapuram', 'Thiruvananthapuram', 'KL', 8.5241, 76.9366], ['Kochi', 'Kochi', 'KL', 9.9312, 76.2673],
  ['Visakhapatnam', 'Visakhapatnam', 'AP', 17.6868, 83.2185], ['Vijayawada', 'Vijayawada', 'AP', 16.5062, 80.6480],
  ['Hyderabad', 'Hyderabad', 'TS', 17.3850, 78.4867],
  ['Mumbai Andheri', 'Mumbai', 'MH', 19.1136, 72.8697], ['Pune', 'Pune', 'MH', 18.5204, 73.8567], ['Nagpur', 'Nagpur', 'MH', 21.1458, 79.0882], ['Nashik', 'Nashik', 'MH', 19.9975, 73.7898],
  ['Ahmedabad', 'Ahmedabad', 'GJ', 23.0225, 72.5714], ['Surat', 'Surat', 'GJ', 21.1702, 72.8311], ['Vadodara', 'Vadodara', 'GJ', 22.3072, 73.1812],
  ['Panaji', 'Panaji', 'GA', 15.4909, 73.8278],
  ['Kolkata', 'Kolkata', 'WB', 22.5726, 88.3639], ['Siliguri', 'Siliguri', 'WB', 26.7271, 88.3953],
  ['Bhubaneswar', 'Bhubaneswar', 'OD', 20.2961, 85.8245], ['Guwahati', 'Guwahati', 'AS', 26.1445, 91.7362],
];

// ---------- names ----------
const firstNames = ['Rajesh', 'Priya', 'Amit', 'Sunita', 'Vikram', 'Anjali', 'Manoj', 'Deepika', 'Suresh', 'Kavita', 'Rohit', 'Neha', 'Arun', 'Pooja', 'Sanjay', 'Meena', 'Rakesh', 'Anita', 'Vijay', 'Ritu', 'Karthik', 'Divya', 'Nikhil', 'Shreya', 'Abhishek', 'Swati', 'Gaurav', 'Lakshmi', 'Harish', 'Nandini', 'Prakash', 'Sneha', 'Ramesh', 'Ayesha', 'Imran', 'Farhan', 'Tanvi', 'Sachin', 'Bhavna', 'Yogesh', 'Preeti', 'Mahesh', 'Jyoti', 'Naveen', 'Rekha', 'Dinesh', 'Shalini', 'Ashok', 'Madhuri', 'Kiran'];
const lastNames = ['Kumar', 'Sharma', 'Patel', 'Devi', 'Singh', 'Gupta', 'Tiwari', 'Rao', 'Yadav', 'Mishra', 'Verma', 'Joshi', 'Nair', 'Reddy', 'Dubey', 'Kumari', 'Pandey', 'Das', 'Chauhan', 'Agarwal', 'Iyer', 'Menon', 'Bose', 'Ghosh', 'Saxena', 'Mehta', 'Shah', 'Desai', 'Kulkarni', 'Pillai', 'Khan', 'Ahmed', 'Choudhary', 'Bhatt', 'Naidu', 'Jain', 'Malhotra', 'Kapoor', 'Sinha', 'Chatterjee'];
const firmSuffix = ['Financial Services', 'Associates', '& Co Finance', 'Loan Solutions', 'Credit Advisory', 'Financial Consultants', '& Partners', 'Loan Services', 'Financial Hub', 'Capital Advisors', 'Finserv', 'Enterprises', 'Loan Point', 'Fincorp', 'Money Matters'];
const borrowerFirms = ['Traders', 'Textiles', 'Agro Industries', 'Electronics', 'Steel Works', 'Pharma', 'Auto Parts', 'Food Products', 'Logistics', 'Garments', 'Hardware', 'Furniture', 'Printing Press', 'Dairy Farm', 'Constructions'];

const usedNames = new Set();
const personName = () => {
  let n;
  do n = `${pick(firstNames)} ${pick(lastNames)}`; while (usedNames.has(n) && usedNames.size < 1800);
  usedNames.add(n);
  return n;
};
const phone = () => `9${ri(100000000, 999999999)}`;
const email = (n) => n.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@bank.in';

// ---------- months (last 12, ending Sep 2026) ----------
const months = [];
for (let i = 11; i >= 0; i--) {
  const d = new Date(2026, 8 - i, 1);
  months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString('en-IN', { month: 'short' }), year: d.getFullYear() });
}

const loanTypes = [
  { type: 'Home Loan', min: 15 * L, max: 80 * L, w: 0.22 },
  { type: 'Business Loan', min: 5 * L, max: 50 * L, w: 0.3 },
  { type: 'Personal Loan', min: 1 * L, max: 10 * L, w: 0.18 },
  { type: 'MSME Loan', min: 10 * L, max: 2 * CR, w: 0.2 },
  { type: 'Vehicle Loan', min: 3 * L, max: 15 * L, w: 0.1 },
];
const pickLoanType = () => {
  const r = rand();
  let acc = 0;
  for (const lt of loanTypes) { acc += lt.w; if (r <= acc) return lt; }
  return loanTypes[0];
};

// ---------- generate ----------
const branches = [];
const officers = [];
const dsas = [];
const loanFiles = [];

let dsaSeq = 1, offSeq = 1, fileSeq = 4000;

branchSeeds.forEach(([name, city, stateId, lat, lng], idx) => {
  const st = states.find((s) => s.id === stateId);
  const id = `BR${String(idx + 1).padStart(3, '0')}`;
  const monthlyTarget = round(rf(3 * CR, 14 * CR), -5);
  // performance personality: some branches lag, some overshoot
  const perf = name === 'Patna South' ? 0.62 : name === 'Chennai' ? 1.04 : name === 'Lucknow South' ? 0.97 : rf(0.55, 1.15);
  const monthlyDisbursement = round(monthlyTarget * perf, -5);
  const officerCount = ri(5, 7);
  const monthly = months.map((m, i) => {
    const seasonal = 1 + 0.12 * Math.sin((i / 12) * Math.PI * 2 + idx);
    const growth = 0.82 + (i / 11) * 0.18;
    const disb = round(monthlyDisbursement * seasonal * growth * rf(0.9, 1.1), -5);
    const submitted = ri(40, 200);
    const approved = Math.round(submitted * rf(0.5, 0.75));
    const rejected = Math.round(submitted * rf(0.1, 0.22));
    return {
      month: m.key, label: m.label,
      disbursement: disb, target: monthlyTarget, submitted, approved, rejected,
      disbursedCount: Math.round(approved * rf(0.7, 0.85)),
      activeDsas: 0, // filled after DSA generation
      commission: round(disb * rf(0.008, 0.014), -3),
      incentive: round(disb * rf(0.004, 0.007), -3),
    };
  });
  const branch = {
    id, name, city, stateId, regionId: st.regionId, head: personName(), phone: phone(),
    lat, lng, officerCount, monthlyTarget, monthlyDisbursement,
    quarterTarget: monthlyTarget * 3,
    quarterDisbursement: monthly.slice(-3).reduce((a, m) => a + m.disbursement, 0),
    targetPct: round(perf * 100, 1),
    filesSubmitted: monthly[11].submitted, filesApproved: monthly[11].approved,
    activeDsas: 0, totalDsas: 0,
    trend: monthly.slice(-6).map((m) => m.disbursement),
    rankHistory: [ri(1, 42), ri(1, 42), ri(1, 42)],
    monthly,
  };
  branches.push(branch);

  // officers
  const branchOfficers = [];
  for (let o = 0; o < officerCount; o++) {
    const oname = o === 0 && name === 'Lucknow Main' ? 'Rajesh Kumar' : o === 1 && name === 'Patna Main' ? 'Manoj Tiwari' : personName();
    const share = rf(0.7, 1.3) / officerCount;
    const disb = round(monthlyDisbursement * share, -4);
    const target = round(monthlyTarget * (1 / officerCount), -4);
    const pct = round((disb / target) * 100, 1);
    const visitsToday = oname === 'Manoj Tiwari' ? 0 : ri(0, 8);
    const lastVisitHours = oname === 'Manoj Tiwari' ? 74 : visitsToday > 0 ? rf(0.2, 6) : rf(20, 60);
    const status = lastVisitHours < 8 ? 'Active' : lastVisitHours < 30 ? 'Idle' : 'Inactive';
    const slab = pct >= 110 ? 'Platinum' : pct >= 90 ? 'Gold' : pct >= 70 ? 'Silver' : 'Bronze';
    const oid = `OF${String(offSeq++).padStart(4, '0')}`;
    const officer = {
      id: oid, name: oname, branchId: id, branchName: name, stateId, regionId: st.regionId, city,
      phone: phone(), email: email(oname), joinedAt: daysAgo(ri(120, 2200)),
      monthlyDisbursement: disb, monthlyTarget: target, targetPct: pct,
      quarterDisbursement: round(disb * rf(2.7, 3.2), -4),
      visitsToday, visitsWeek: visitsToday + ri(12, 30), avgDailyVisits: round(rf(3, 8), 1),
      visitTarget: 6, fieldHoursToday: round(rf(2, 7.5), 1),
      filesSubmitted: ri(8, 40), filesApproved: 0,
      dsaCount: 0, dsasMet: ri(1, 6),
      lastVisit: hoursAgo(lastVisitHours), status,
      slab, incentiveMTD: round(disb * rf(0.004, 0.008), -2),
      trend: Array.from({ length: 6 }, () => round(disb * rf(0.75, 1.2), -4)),
      streakMonths: ri(0, 4),
    };
    officer.filesApproved = Math.round(officer.filesSubmitted * rf(0.5, 0.8));
    officers.push(officer);
    branchOfficers.push(officer);
  }

  // DSAs (5–8 per officer, so coverage / favouritism is measurable)
  const dsaPlan = branchOfficers.flatMap((owner) => Array.from({ length: ri(5, 8) }, () => owner));
  dsaPlan.forEach((owner, d) => {
    const ln = pick(lastNames);
    const firm = d === 0 && name === 'Patna Main' ? 'Sharma Associates' : d === 0 && name === 'Lucknow Main' ? 'Gupta Finance' : `${ln} ${pick(firmSuffix)}`;
    const files = ri(5, 60);
    const approvalRate = round(rf(35, 85), 1);
    const approved = Math.round(files * approvalRate / 100);
    const lastActiveDays = firm === 'Sharma Associates' ? 22 : rand() < 0.12 ? ri(31, 95) : rand() < 0.15 ? ri(15, 30) : ri(0, 14);
    const quality = lastActiveDays > 60 ? 'Inactive' : approvalRate >= 65 && files >= 15 ? 'High' : approvalRate >= 50 ? 'Average' : 'Low';
    const onboardedDays = firm === 'Gupta Finance' ? 0 : ri(1, 1400);
    const dsa = {
      id: `DSA${String(dsaSeq++).padStart(4, '0')}`,
      name: `${pick(firstNames)} ${ln}`, firm, city, branchId: id, branchName: name, stateId, regionId: st.regionId,
      officerId: owner.id, officerName: owner.name, phone: phone(),
      files, approved, approvalRate, disbursement: round(approved * rf(8 * L, 30 * L), -4),
      quality, qualityScore: round(approvalRate * 0.6 + Math.min(files, 40) + rf(0, 10), 0),
      lastActive: daysAgo(lastActiveDays), onboardedAt: daysAgo(onboardedDays),
      trend: Array.from({ length: 6 }, () => ri(2, 14)),
      declining: lastActiveDays > 14 && lastActiveDays <= 60 && rand() < 0.7,
    };
    dsa.commission = round(dsa.disbursement * rf(0.008, 0.014), -2);
    dsas.push(dsa);
    owner.dsaCount++;
  });
  const bd = dsas.filter((x) => x.branchId === id);

  // officer productivity: how visits are spread across DSAs, whether they convert, collection & customer fairness
  branchOfficers.forEach((o, oi) => {
    const mine = bd.filter((x) => x.officerId === o.id);
    // behaviour personality → drives the red-flag cases the branch head should catch
    const persona = o.name === 'Manoj Tiwari' ? 'low'
      : name === 'Patna Main' && oi === 2 ? 'concentrated'
      : name === 'Patna Main' && oi === 0 ? 'balanced'
      : rand() < 0.2 ? 'concentrated' : rand() < 0.2 ? 'low' : 'balanced';
    const perDsaTarget = 4;
    const target = mine.length * perDsaTarget;
    const total = persona === 'low' ? ri(Math.round(target * 0.35), Math.round(target * 0.65))
      : persona === 'concentrated' ? ri(Math.round(target * 0.95), Math.round(target * 1.15))
      : ri(Math.round(target * 0.8), Math.round(target * 1.1));
    // distribute visits across DSAs
    let weights;
    if (persona === 'concentrated') {
      weights = mine.map((_, i) => (i === 0 ? rf(6, 9) : i === 1 ? rf(2, 4) : rf(0, 0.6)));
    } else if (persona === 'low') {
      weights = mine.map(() => rf(0, 2));
    } else {
      weights = mine.map(() => rf(0.8, 1.3));
    }
    const wsum = weights.reduce((a, w) => a + w, 0) || 1;
    let allocated = 0;
    const dsaVisits = mine.map((d, i) => {
      const v = i === mine.length - 1 ? Math.max(0, total - allocated) : Math.round((weights[i] / wsum) * total);
      allocated += v;
      const convRate = persona === 'balanced' ? rf(0.35, 0.6) : rf(0.2, 0.4);
      return { dsaId: d.id, firm: d.firm, quality: d.quality, visits: v, target: perDsaTarget, filesCollected: Math.round(v * convRate) };
    });
    const dsaVisitsTotal = dsaVisits.reduce((a, x) => a + x.visits, 0);
    const productiveVisits = dsaVisits.reduce((a, x) => a + x.filesCollected, 0);
    const collectionVisits = ri(4, 14);
    const collectionDue = round(rf(3 * L, 20 * L), -4);
    const collectionPct = persona === 'balanced' ? rf(0.7, 0.98) : rf(0.4, 0.75);
    const customerVisits = ri(12, 30);
    const fairness = persona === 'concentrated' ? rf(0.35, 0.55) : persona === 'low' ? rf(0.5, 0.75) : rf(0.75, 0.95);
    const monthVisits = dsaVisitsTotal + collectionVisits + customerVisits;
    Object.assign(o, {
      persona,
      dsaVisits,
      dsaVisitTarget: target,
      dsaVisitsMonth: dsaVisitsTotal,
      productiveVisits,
      collectionVisits,
      collectionDue,
      collectionAmount: round(collectionDue * collectionPct, -3),
      customerVisits,
      uniqueCustomers: Math.max(1, Math.round(customerVisits * fairness)),
      customersCount: ri(15, 60),
      commissionMTD: mine.reduce((a, x) => a + x.commission, 0),
      visitsMonth: monthVisits,
      avgWeeklyMeetings: round(monthVisits / 4.3, 1),
    });
    o.visitsWeek = Math.round(monthVisits / 4.3);
    o.avgDailyVisits = round(o.visitsWeek / 6, 1);
  });
  branch.totalDsas = bd.length;
  branch.activeDsas = bd.filter((x) => x.quality !== 'Inactive').length;
  branch.newDsasThisMonth = bd.filter((x) => (NOW - new Date(x.onboardedAt)) / 86400000 <= 30).length;
  branch.avgQualityScore = round(bd.reduce((a, x) => a + x.qualityScore, 0) / bd.length, 0);
  branch.customersCount = branchOfficers.reduce((a, o) => a + o.customersCount, 0);
  branch.commissionMTD = branchOfficers.reduce((a, o) => a + o.commissionMTD, 0);
  monthly.forEach((m, i) => { m.activeDsas = Math.max(3, Math.round(branch.activeDsas * (0.8 + i * 0.02) * rf(0.95, 1.05))); });

  // loan files (pipeline)
  const stages = ['Submitted', 'Under Review', 'Approved', 'Disbursed', 'Rejected', 'Incomplete'];
  const stageW = [0.22, 0.2, 0.14, 0.24, 0.1, 0.1];
  const nFiles = ri(14, 22);
  for (let f = 0; f < nFiles; f++) {
    const lt = pickLoanType();
    const r = rand(); let acc = 0, stage = stages[0];
    for (let s = 0; s < stages.length; s++) { acc += stageW[s]; if (r <= acc) { stage = stages[s]; break; } }
    const dsa = pick(bd);
    const daysAtStage = stage === 'Under Review' && rand() < 0.25 ? ri(10, 24) : ri(0, 9);
    const borrowerPerson = rand() < 0.5;
    loanFiles.push({
      id: `LF-${fileSeq++}`,
      borrower: borrowerPerson ? personName() : `${pick(lastNames)} ${pick(borrowerFirms)}`,
      loanType: lt.type, amount: round(rf(lt.min, lt.max), -4),
      dsaId: dsa.id, dsaFirm: dsa.firm, branchId: id, branchName: name, stateId, regionId: st.regionId,
      officerId: dsa.officerId, officerName: dsa.officerName,
      stage, daysAtStage, submittedAt: daysAgo(daysAtStage + ri(1, 20)),
    });
  }
});

// fix: activeDsas month series shouldn't exceed total
// national monthly aggregate
const monthlyTrends = months.map((m, i) => {
  const agg = { month: m.key, label: m.label, disbursement: 0, target: 0, submitted: 0, approved: 0, rejected: 0, disbursedCount: 0, activeDsas: 0, commission: 0, incentive: 0 };
  branches.forEach((b) => { const x = b.monthly[i]; for (const k of Object.keys(agg)) if (typeof agg[k] === 'number') agg[k] += x[k]; });
  return agg;
});

const incentiveSlabs = [
  { slab: 'Platinum', minPct: 110, rate: 0.8, color: '#6C5CE7', bonus: 25000, description: '≥110% of target' },
  { slab: 'Gold', minPct: 90, rate: 0.6, color: '#F5B301', bonus: 12000, description: '90 – 110% of target' },
  { slab: 'Silver', minPct: 70, rate: 0.4, color: '#9896AB', bonus: 5000, description: '70 – 90% of target' },
  { slab: 'Bronze', minPct: 0, rate: 0.25, color: '#CD7F32', bonus: 0, description: 'Below 70% of target' },
];

// ---------- notifications ----------
const bId = (n) => branches.find((b) => b.name === n)?.id;
const stuck = loanFiles.filter((f) => f.stage === 'Under Review' && f.daysAtStage >= 10).length;
const notifications = [
  { id: 'N001', severity: 'critical', message: 'Patna South branch is 35% below monthly target', source: 'Branch Performance', link: '/drilldown', branchId: bId('Patna South'), stateId: 'BR', regionId: 'north', time: hoursAgo(1), status: 'open' },
  { id: 'N002', severity: 'warning', message: 'DSA Sharma Associates inactive for 22 days', source: 'DSA Network', link: '/dsa', branchId: bId('Patna Main'), stateId: 'BR', regionId: 'north', time: hoursAgo(3), status: 'open' },
  { id: 'N003', severity: 'warning', message: `${stuck} loan files stuck in Under Review for 10+ days`, source: 'Loan Pipeline', link: '/pipeline', branchId: null, stateId: null, regionId: null, time: hoursAgo(5), status: 'open' },
  { id: 'N004', severity: 'critical', message: 'Officer Manoj Tiwari has not logged visits in 3 days', source: 'Officer Activity', link: '/activity', branchId: bId('Patna Main'), stateId: 'BR', regionId: 'north', time: hoursAgo(6), status: 'open' },
  { id: 'N005', severity: 'info', message: 'Chennai branch achieved 104% of monthly target', source: 'Branch Performance', link: '/leaderboard', branchId: bId('Chennai'), stateId: 'TN', regionId: 'south', time: hoursAgo(7), status: 'open' },
  { id: 'N006', severity: 'warning', message: 'Approval rate in Gujarat dropped 6 pts week-on-week', source: 'Loan Pipeline', link: '/pipeline', branchId: null, stateId: 'GJ', regionId: 'west', time: hoursAgo(20), status: 'open' },
  { id: 'N007', severity: 'info', message: 'New DSA onboarded: Gupta Finance, Lucknow', source: 'DSA Network', link: '/dsa', branchId: bId('Lucknow Main'), stateId: 'UP', regionId: 'north', time: hoursAgo(2), status: 'open' },
  { id: 'N008', severity: 'critical', message: 'Siliguri branch has 0 disbursements in the last 7 days', source: 'Branch Performance', link: '/drilldown', branchId: bId('Siliguri'), stateId: 'WB', regionId: 'east', time: hoursAgo(26), status: 'open' },
  { id: 'N009', severity: 'warning', message: '4 officers in Nagpur below 50% visit compliance this week', source: 'Officer Activity', link: '/activity', branchId: bId('Nagpur'), stateId: 'MH', regionId: 'west', time: hoursAgo(30), status: 'open' },
  { id: 'N010', severity: 'info', message: 'Quarterly incentive payout processed for South Region', source: 'Incentives', link: '/incentives', branchId: null, stateId: null, regionId: 'south', time: hoursAgo(50), status: 'resolved' },
  { id: 'N011', severity: 'warning', message: '3 DSAs in Kanpur flagged at-risk (no files in 20 days)', source: 'DSA Network', link: '/dsa', branchId: bId('Kanpur'), stateId: 'UP', regionId: 'north', time: hoursAgo(55), status: 'open' },
  { id: 'N012', severity: 'critical', message: 'Rejection rate at Jodhpur crossed 30% this month', source: 'Loan Pipeline', link: '/pipeline', branchId: bId('Jodhpur'), stateId: 'RJ', regionId: 'north', time: hoursAgo(70), status: 'open' },
  { id: 'N013', severity: 'info', message: 'Weekly summary report is ready for download', source: 'Reports', link: '/reports', branchId: null, stateId: null, regionId: null, time: hoursAgo(90), status: 'resolved' },
  { id: 'N014', severity: 'warning', message: 'Officer Priya Sharma (Kochi) is 18% short of Gold slab', source: 'Incentives', link: '/incentives', branchId: bId('Kochi'), stateId: 'KL', regionId: 'south', time: hoursAgo(100), status: 'open' },
];

const activity = [
  { id: 'A1', type: 'info', text: 'New DSA onboarded: Gupta Finance, Lucknow', time: hoursAgo(2), branchId: bId('Lucknow Main') },
  { id: 'A2', type: 'success', text: 'Loan #LF-4521 disbursed: ₹25 L, Patna Main', time: hoursAgo(3), branchId: bId('Patna Main') },
  { id: 'A3', type: 'success', text: 'Monthly target achieved: Chennai branch at 104%', time: hoursAgo(5), branchId: bId('Chennai') },
  { id: 'A4', type: 'warning', text: '12 files moved to Under Review at Bengaluru', time: hoursAgo(6), branchId: bId('Bengaluru') },
  { id: 'A5', type: 'info', text: 'Officer Rajesh Kumar completed 8 DSA visits today', time: hoursAgo(7), branchId: bId('Lucknow Main') },
  { id: 'A6', type: 'success', text: 'Loan #LF-4498 approved: ₹1.2 Cr MSME, Ahmedabad', time: hoursAgo(9), branchId: bId('Ahmedabad') },
  { id: 'A7', type: 'danger', text: 'Loan #LF-4470 rejected: incomplete KYC, Jodhpur', time: hoursAgo(12), branchId: bId('Jodhpur') },
];

const users = [
  { id: 'U1', phone: '9999000001', name: 'Arvind Mehta', role: 'national', roleLabel: 'National Business Head', jurisdiction: {} },
  { id: 'U2', phone: '9999000002', name: 'Vikram Malhotra', role: 'regional', roleLabel: 'Regional Head · North', jurisdiction: { regionId: 'north' } },
  { id: 'U3', phone: '9999000003', name: 'Rakesh Pandey', role: 'state', roleLabel: 'State Head · Bihar', jurisdiction: { regionId: 'north', stateId: 'BR' } },
  { id: 'U4', phone: '9999000004', name: branches.find((b) => b.name === 'Patna Main').head, role: 'branch', roleLabel: 'Branch Head · Patna Main', jurisdiction: { regionId: 'north', stateId: 'BR', branchId: bId('Patna Main') } },
];

// ---------- write ----------
fs.mkdirSync(OUT, { recursive: true });
const write = (f, d) => fs.writeFileSync(path.join(OUT, f), JSON.stringify(d, null, 1));
write('regions.json', regions);
write('states.json', states);
write('branches.json', branches);
write('officers.json', officers);
write('dsas.json', dsas);
write('loanFiles.json', loanFiles);
write('incentiveSlabs.json', incentiveSlabs);
write('notifications.json', notifications);
write('activity.json', activity);
write('monthlyTrends.json', monthlyTrends);
write('users.json', users);
write('months.json', months);

console.log(`branches ${branches.length}, officers ${officers.length}, dsas ${dsas.length}, loanFiles ${loanFiles.length}`);
