/**
 * City dataset.
 *
 * Every `tz` is an IANA identifier and is checked against the runtime's own
 * zone list by scripts/validate-cities.ts, which the build runs first — a typo
 * fails the build rather than shipping a wrong clock.
 *
 * `rank` is a rough search-demand weight (higher = more searched); it decides
 * which pairs get pre-rendered and which are left to render on demand.
 */

export type City = {
  slug: string;
  name: string;
  country: string;
  cc: string;
  tz: string;
  lat: number;
  lon: number;
  rank: number;
  aka?: string[];
};

const C = (
  slug: string, name: string, country: string, cc: string, tz: string,
  lat: number, lon: number, rank: number, aka?: string[],
): City => ({ slug, name, country, cc, tz, lat, lon, rank, aka });

export const CITIES: City[] = [
  /* ---------------- North America ---------------- */
  C("new-york", "New York", "United States", "US", "America/New_York", 40.7128, -74.006, 100, ["nyc", "manhattan"]),
  C("los-angeles", "Los Angeles", "United States", "US", "America/Los_Angeles", 34.0522, -118.2437, 96, ["la"]),
  C("san-francisco", "San Francisco", "United States", "US", "America/Los_Angeles", 37.7749, -122.4194, 94, ["sf", "bay area", "sfo"]),
  C("chicago", "Chicago", "United States", "US", "America/Chicago", 41.8781, -87.6298, 88, []),
  C("seattle", "Seattle", "United States", "US", "America/Los_Angeles", 47.6062, -122.3321, 82, []),
  C("boston", "Boston", "United States", "US", "America/New_York", 42.3601, -71.0589, 80, []),
  C("washington", "Washington, D.C.", "United States", "US", "America/New_York", 38.9072, -77.0369, 80, ["dc"]),
  C("miami", "Miami", "United States", "US", "America/New_York", 25.7617, -80.1918, 80, []),
  C("atlanta", "Atlanta", "United States", "US", "America/New_York", 33.749, -84.388, 76, []),
  C("dallas", "Dallas", "United States", "US", "America/Chicago", 32.7767, -96.797, 74, []),
  C("houston", "Houston", "United States", "US", "America/Chicago", 29.7604, -95.3698, 74, []),
  C("austin", "Austin", "United States", "US", "America/Chicago", 30.2672, -97.7431, 70, []),
  C("denver", "Denver", "United States", "US", "America/Denver", 39.7392, -104.9903, 72, []),
  C("phoenix", "Phoenix", "United States", "US", "America/Phoenix", 33.4484, -112.074, 70, []),
  C("las-vegas", "Las Vegas", "United States", "US", "America/Los_Angeles", 36.1699, -115.1398, 70, []),
  C("san-diego", "San Diego", "United States", "US", "America/Los_Angeles", 32.7157, -117.1611, 68, []),
  C("portland", "Portland", "United States", "US", "America/Los_Angeles", 45.5152, -122.6784, 62, []),
  C("minneapolis", "Minneapolis", "United States", "US", "America/Chicago", 44.9778, -93.265, 60, []),
  C("detroit", "Detroit", "United States", "US", "America/New_York", 42.3314, -83.0458, 58, []),
  C("philadelphia", "Philadelphia", "United States", "US", "America/New_York", 39.9526, -75.1652, 62, []),
  C("salt-lake-city", "Salt Lake City", "United States", "US", "America/Denver", 40.7608, -111.891, 54, []),
  C("honolulu", "Honolulu", "United States", "US", "Pacific/Honolulu", 21.3069, -157.8583, 62, ["hawaii"]),
  C("anchorage", "Anchorage", "United States", "US", "America/Anchorage", 61.2181, -149.9003, 50, ["alaska"]),
  C("toronto", "Toronto", "Canada", "CA", "America/Toronto", 43.6532, -79.3832, 84, []),
  C("vancouver", "Vancouver", "Canada", "CA", "America/Vancouver", 49.2827, -123.1207, 76, []),
  C("montreal", "Montreal", "Canada", "CA", "America/Toronto", 45.5019, -73.5674, 68, []),
  C("calgary", "Calgary", "Canada", "CA", "America/Edmonton", 51.0447, -114.0719, 60, []),
  C("winnipeg", "Winnipeg", "Canada", "CA", "America/Winnipeg", 49.8951, -97.1384, 48, []),
  C("halifax", "Halifax", "Canada", "CA", "America/Halifax", 44.6488, -63.5752, 46, []),
  C("st-johns", "St. John's", "Canada", "CA", "America/St_Johns", 47.5615, -52.7126, 42, ["newfoundland"]),
  C("mexico-city", "Mexico City", "Mexico", "MX", "America/Mexico_City", 19.4326, -99.1332, 82, ["cdmx"]),
  C("cancun", "Cancún", "Mexico", "MX", "America/Cancun", 21.1619, -86.8515, 62, []),
  C("guadalajara", "Guadalajara", "Mexico", "MX", "America/Mexico_City", 20.6597, -103.3496, 56, []),
  C("guatemala-city", "Guatemala City", "Guatemala", "GT", "America/Guatemala", 14.6349, -90.5069, 46, []),
  C("panama-city", "Panama City", "Panama", "PA", "America/Panama", 8.9824, -79.5199, 50, []),
  C("san-jose-cr", "San José", "Costa Rica", "CR", "America/Costa_Rica", 9.9281, -84.0907, 46, []),
  C("havana", "Havana", "Cuba", "CU", "America/Havana", 23.1136, -82.3666, 50, []),
  C("kingston", "Kingston", "Jamaica", "JM", "America/Jamaica", 17.9714, -76.7931, 44, []),
  C("san-juan", "San Juan", "Puerto Rico", "PR", "America/Puerto_Rico", 18.4655, -66.1057, 46, []),

  /* ---------------- South America ---------------- */
  C("sao-paulo", "São Paulo", "Brazil", "BR", "America/Sao_Paulo", -23.5505, -46.6333, 82, []),
  C("rio-de-janeiro", "Rio de Janeiro", "Brazil", "BR", "America/Sao_Paulo", -22.9068, -43.1729, 78, ["rio"]),
  C("brasilia", "Brasília", "Brazil", "BR", "America/Sao_Paulo", -15.7939, -47.8828, 58, []),
  C("buenos-aires", "Buenos Aires", "Argentina", "AR", "America/Argentina/Buenos_Aires", -34.6037, -58.3816, 78, []),
  C("santiago", "Santiago", "Chile", "CL", "America/Santiago", -33.4489, -70.6693, 68, []),
  C("lima", "Lima", "Peru", "PE", "America/Lima", -12.0464, -77.0428, 68, []),
  C("bogota", "Bogotá", "Colombia", "CO", "America/Bogota", 4.711, -74.0721, 70, []),
  C("medellin", "Medellín", "Colombia", "CO", "America/Bogota", 6.2442, -75.5812, 56, []),
  C("quito", "Quito", "Ecuador", "EC", "America/Guayaquil", -0.1807, -78.4678, 52, []),
  C("caracas", "Caracas", "Venezuela", "VE", "America/Caracas", 10.4806, -66.9036, 52, []),
  C("montevideo", "Montevideo", "Uruguay", "UY", "America/Montevideo", -34.9011, -56.1645, 48, []),
  C("asuncion", "Asunción", "Paraguay", "PY", "America/Asuncion", -25.2637, -57.5759, 42, []),
  C("la-paz", "La Paz", "Bolivia", "BO", "America/La_Paz", -16.5, -68.15, 46, []),

  /* ---------------- Europe ---------------- */
  C("london", "London", "United Kingdom", "GB", "Europe/London", 51.5072, -0.1276, 100, []),
  C("manchester", "Manchester", "United Kingdom", "GB", "Europe/London", 53.4808, -2.2426, 60, []),
  C("edinburgh", "Edinburgh", "United Kingdom", "GB", "Europe/London", 55.9533, -3.1883, 56, []),
  C("dublin", "Dublin", "Ireland", "IE", "Europe/Dublin", 53.3498, -6.2603, 68, []),
  C("paris", "Paris", "France", "FR", "Europe/Paris", 48.8566, 2.3522, 94, []),
  C("madrid", "Madrid", "Spain", "ES", "Europe/Madrid", 40.4168, -3.7038, 80, []),
  C("barcelona", "Barcelona", "Spain", "ES", "Europe/Madrid", 41.3874, 2.1686, 78, []),
  C("lisbon", "Lisbon", "Portugal", "PT", "Europe/Lisbon", 38.7223, -9.1393, 70, []),
  C("amsterdam", "Amsterdam", "Netherlands", "NL", "Europe/Amsterdam", 52.3676, 4.9041, 80, []),
  C("brussels", "Brussels", "Belgium", "BE", "Europe/Brussels", 50.8503, 4.3517, 64, []),
  C("berlin", "Berlin", "Germany", "DE", "Europe/Berlin", 52.52, 13.405, 86, []),
  C("munich", "Munich", "Germany", "DE", "Europe/Berlin", 48.1351, 11.582, 70, []),
  C("frankfurt", "Frankfurt", "Germany", "DE", "Europe/Berlin", 50.1109, 8.6821, 68, []),
  C("zurich", "Zurich", "Switzerland", "CH", "Europe/Zurich", 47.3769, 8.5417, 66, []),
  C("geneva", "Geneva", "Switzerland", "CH", "Europe/Zurich", 46.2044, 6.1432, 58, []),
  C("vienna", "Vienna", "Austria", "AT", "Europe/Vienna", 48.2082, 16.3738, 66, []),
  C("rome", "Rome", "Italy", "IT", "Europe/Rome", 41.9028, 12.4964, 80, []),
  C("milan", "Milan", "Italy", "IT", "Europe/Rome", 45.4642, 9.19, 72, []),
  C("prague", "Prague", "Czechia", "CZ", "Europe/Prague", 50.0755, 14.4378, 64, []),
  C("warsaw", "Warsaw", "Poland", "PL", "Europe/Warsaw", 52.2297, 21.0122, 62, []),
  C("budapest", "Budapest", "Hungary", "HU", "Europe/Budapest", 47.4979, 19.0402, 58, []),
  C("bucharest", "Bucharest", "Romania", "RO", "Europe/Bucharest", 44.4268, 26.1025, 54, []),
  C("stockholm", "Stockholm", "Sweden", "SE", "Europe/Stockholm", 59.3293, 18.0686, 62, []),
  C("oslo", "Oslo", "Norway", "NO", "Europe/Oslo", 59.9139, 10.7522, 58, []),
  C("copenhagen", "Copenhagen", "Denmark", "DK", "Europe/Copenhagen", 55.6761, 12.5683, 62, []),
  C("helsinki", "Helsinki", "Finland", "FI", "Europe/Helsinki", 60.1699, 24.9384, 56, []),
  C("reykjavik", "Reykjavík", "Iceland", "IS", "Atlantic/Reykjavik", 64.1466, -21.9426, 52, []),
  C("athens", "Athens", "Greece", "GR", "Europe/Athens", 37.9838, 23.7275, 62, []),
  C("istanbul", "Istanbul", "Türkiye", "TR", "Europe/Istanbul", 41.0082, 28.9784, 78, []),
  C("moscow", "Moscow", "Russia", "RU", "Europe/Moscow", 55.7558, 37.6173, 76, []),
  C("saint-petersburg", "Saint Petersburg", "Russia", "RU", "Europe/Moscow", 59.9311, 30.3609, 58, []),
  C("kyiv", "Kyiv", "Ukraine", "UA", "Europe/Kyiv", 50.4501, 30.5234, 60, ["kiev"]),

  /* ---------------- Middle East ---------------- */
  C("dubai", "Dubai", "United Arab Emirates", "AE", "Asia/Dubai", 25.2048, 55.2708, 92, []),
  C("abu-dhabi", "Abu Dhabi", "United Arab Emirates", "AE", "Asia/Dubai", 24.4539, 54.3773, 70, []),
  C("doha", "Doha", "Qatar", "QA", "Asia/Qatar", 25.2854, 51.531, 66, []),
  C("riyadh", "Riyadh", "Saudi Arabia", "SA", "Asia/Riyadh", 24.7136, 46.6753, 70, []),
  C("jeddah", "Jeddah", "Saudi Arabia", "SA", "Asia/Riyadh", 21.4858, 39.1925, 62, []),
  C("kuwait-city", "Kuwait City", "Kuwait", "KW", "Asia/Kuwait", 29.3759, 47.9774, 56, []),
  C("muscat", "Muscat", "Oman", "OM", "Asia/Muscat", 23.588, 58.3829, 52, []),
  C("manama", "Manama", "Bahrain", "BH", "Asia/Bahrain", 26.2285, 50.586, 50, []),
  C("tel-aviv", "Tel Aviv", "Israel", "IL", "Asia/Jerusalem", 32.0853, 34.7818, 64, []),
  C("amman", "Amman", "Jordan", "JO", "Asia/Amman", 31.9454, 35.9284, 50, []),
  C("beirut", "Beirut", "Lebanon", "LB", "Asia/Beirut", 33.8938, 35.5018, 50, []),
  C("tehran", "Tehran", "Iran", "IR", "Asia/Tehran", 35.6892, 51.389, 58, []),
  C("baku", "Baku", "Azerbaijan", "AZ", "Asia/Baku", 40.4093, 49.8671, 48, []),
  C("tbilisi", "Tbilisi", "Georgia", "GE", "Asia/Tbilisi", 41.7151, 44.8271, 46, []),
  C("yerevan", "Yerevan", "Armenia", "AM", "Asia/Yerevan", 40.1792, 44.4991, 44, []),

  /* ---------------- Africa ---------------- */
  C("cairo", "Cairo", "Egypt", "EG", "Africa/Cairo", 30.0444, 31.2357, 74, []),
  C("lagos", "Lagos", "Nigeria", "NG", "Africa/Lagos", 6.5244, 3.3792, 70, []),
  C("abuja", "Abuja", "Nigeria", "NG", "Africa/Lagos", 9.0765, 7.3986, 52, []),
  C("accra", "Accra", "Ghana", "GH", "Africa/Accra", 5.6037, -0.187, 56, []),
  C("nairobi", "Nairobi", "Kenya", "KE", "Africa/Nairobi", -1.2921, 36.8219, 66, []),
  C("addis-ababa", "Addis Ababa", "Ethiopia", "ET", "Africa/Addis_Ababa", 9.03, 38.74, 54, []),
  C("dar-es-salaam", "Dar es Salaam", "Tanzania", "TZ", "Africa/Dar_es_Salaam", -6.7924, 39.2083, 50, []),
  C("kampala", "Kampala", "Uganda", "UG", "Africa/Kampala", 0.3476, 32.5825, 48, []),
  C("johannesburg", "Johannesburg", "South Africa", "ZA", "Africa/Johannesburg", -26.2041, 28.0473, 72, ["joburg"]),
  C("cape-town", "Cape Town", "South Africa", "ZA", "Africa/Johannesburg", -33.9249, 18.4241, 74, []),
  C("durban", "Durban", "South Africa", "ZA", "Africa/Johannesburg", -29.8587, 31.0218, 52, []),
  C("casablanca", "Casablanca", "Morocco", "MA", "Africa/Casablanca", 33.5731, -7.5898, 58, []),
  C("marrakesh", "Marrakesh", "Morocco", "MA", "Africa/Casablanca", 31.6295, -7.9811, 56, ["marrakech"]),
  C("tunis", "Tunis", "Tunisia", "TN", "Africa/Tunis", 36.8065, 10.1815, 48, []),
  C("algiers", "Algiers", "Algeria", "DZ", "Africa/Algiers", 36.7538, 3.0588, 48, []),
  C("khartoum", "Khartoum", "Sudan", "SD", "Africa/Khartoum", 15.5007, 32.5599, 42, []),
  C("kinshasa", "Kinshasa", "DR Congo", "CD", "Africa/Kinshasa", -4.4419, 15.2663, 48, []),
  C("luanda", "Luanda", "Angola", "AO", "Africa/Luanda", -8.839, 13.2894, 44, []),
  C("dakar", "Dakar", "Senegal", "SN", "Africa/Dakar", 14.7167, -17.4677, 46, []),
  C("port-louis", "Port Louis", "Mauritius", "MU", "Indian/Mauritius", -20.1609, 57.5012, 44, []),

  /* ---------------- South & Central Asia ---------------- */
  C("new-delhi", "New Delhi", "India", "IN", "Asia/Kolkata", 28.6139, 77.209, 98, ["delhi", "ncr"]),
  C("mumbai", "Mumbai", "India", "IN", "Asia/Kolkata", 19.076, 72.8777, 96, ["bombay"]),
  C("bengaluru", "Bengaluru", "India", "IN", "Asia/Kolkata", 12.9716, 77.5946, 92, ["bangalore"]),
  C("hyderabad", "Hyderabad", "India", "IN", "Asia/Kolkata", 17.385, 78.4867, 82, []),
  C("chennai", "Chennai", "India", "IN", "Asia/Kolkata", 13.0827, 80.2707, 82, ["madras"]),
  C("kolkata", "Kolkata", "India", "IN", "Asia/Kolkata", 22.5726, 88.3639, 80, ["calcutta"]),
  C("pune", "Pune", "India", "IN", "Asia/Kolkata", 18.5204, 73.8567, 74, []),
  C("ahmedabad", "Ahmedabad", "India", "IN", "Asia/Kolkata", 23.0225, 72.5714, 68, []),
  C("jaipur", "Jaipur", "India", "IN", "Asia/Kolkata", 26.9124, 75.7873, 62, []),
  C("kochi", "Kochi", "India", "IN", "Asia/Kolkata", 9.9312, 76.2673, 58, ["cochin"]),
  C("goa", "Goa", "India", "IN", "Asia/Kolkata", 15.2993, 74.124, 62, ["panaji"]),
  C("karachi", "Karachi", "Pakistan", "PK", "Asia/Karachi", 24.8607, 67.0011, 74, []),
  C("lahore", "Lahore", "Pakistan", "PK", "Asia/Karachi", 31.5204, 74.3587, 70, []),
  C("islamabad", "Islamabad", "Pakistan", "PK", "Asia/Karachi", 33.6844, 73.0479, 64, []),
  C("dhaka", "Dhaka", "Bangladesh", "BD", "Asia/Dhaka", 23.8103, 90.4125, 72, []),
  C("chittagong", "Chattogram", "Bangladesh", "BD", "Asia/Dhaka", 22.3569, 91.7832, 52, ["chittagong"]),
  C("colombo", "Colombo", "Sri Lanka", "LK", "Asia/Colombo", 6.9271, 79.8612, 62, []),
  C("kathmandu", "Kathmandu", "Nepal", "NP", "Asia/Kathmandu", 27.7172, 85.324, 60, []),
  C("male", "Malé", "Maldives", "MV", "Indian/Maldives", 4.1755, 73.5093, 52, ["maldives"]),
  C("kabul", "Kabul", "Afghanistan", "AF", "Asia/Kabul", 34.5553, 69.2075, 46, []),
  C("tashkent", "Tashkent", "Uzbekistan", "UZ", "Asia/Tashkent", 41.2995, 69.2401, 46, []),
  C("almaty", "Almaty", "Kazakhstan", "KZ", "Asia/Almaty", 43.222, 76.8512, 48, []),

  /* ---------------- East & Southeast Asia ---------------- */
  C("singapore", "Singapore", "Singapore", "SG", "Asia/Singapore", 1.3521, 103.8198, 92, []),
  C("bangkok", "Bangkok", "Thailand", "TH", "Asia/Bangkok", 13.7563, 100.5018, 86, []),
  C("phuket", "Phuket", "Thailand", "TH", "Asia/Bangkok", 7.8804, 98.3923, 62, []),
  C("kuala-lumpur", "Kuala Lumpur", "Malaysia", "MY", "Asia/Kuala_Lumpur", 3.139, 101.6869, 76, ["kl"]),
  C("jakarta", "Jakarta", "Indonesia", "ID", "Asia/Jakarta", -6.2088, 106.8456, 78, []),
  C("bali", "Bali", "Indonesia", "ID", "Asia/Makassar", -8.4095, 115.1889, 74, ["denpasar"]),
  C("manila", "Manila", "Philippines", "PH", "Asia/Manila", 14.5995, 120.9842, 76, []),
  C("cebu", "Cebu", "Philippines", "PH", "Asia/Manila", 10.3157, 123.8854, 56, []),
  C("hanoi", "Hanoi", "Vietnam", "VN", "Asia/Ho_Chi_Minh", 21.0278, 105.8342, 64, []),
  C("ho-chi-minh-city", "Ho Chi Minh City", "Vietnam", "VN", "Asia/Ho_Chi_Minh", 10.8231, 106.6297, 68, ["saigon"]),
  C("yangon", "Yangon", "Myanmar", "MM", "Asia/Yangon", 16.8409, 96.1735, 48, ["rangoon"]),
  C("phnom-penh", "Phnom Penh", "Cambodia", "KH", "Asia/Phnom_Penh", 11.5564, 104.9282, 48, []),
  C("hong-kong", "Hong Kong", "Hong Kong", "HK", "Asia/Hong_Kong", 22.3193, 114.1694, 88, []),
  C("shanghai", "Shanghai", "China", "CN", "Asia/Shanghai", 31.2304, 121.4737, 88, []),
  C("beijing", "Beijing", "China", "CN", "Asia/Shanghai", 39.9042, 116.4074, 88, ["peking"]),
  C("shenzhen", "Shenzhen", "China", "CN", "Asia/Shanghai", 22.5431, 114.0579, 70, []),
  C("guangzhou", "Guangzhou", "China", "CN", "Asia/Shanghai", 23.1291, 113.2644, 68, []),
  C("taipei", "Taipei", "Taiwan", "TW", "Asia/Taipei", 25.033, 121.5654, 72, []),
  C("seoul", "Seoul", "South Korea", "KR", "Asia/Seoul", 37.5665, 126.978, 86, []),
  C("busan", "Busan", "South Korea", "KR", "Asia/Seoul", 35.1796, 129.0756, 56, []),
  C("tokyo", "Tokyo", "Japan", "JP", "Asia/Tokyo", 35.6762, 139.6503, 94, []),
  C("osaka", "Osaka", "Japan", "JP", "Asia/Tokyo", 34.6937, 135.5023, 72, []),
  C("kyoto", "Kyoto", "Japan", "JP", "Asia/Tokyo", 35.0116, 135.7681, 68, []),
  C("ulaanbaatar", "Ulaanbaatar", "Mongolia", "MN", "Asia/Ulaanbaatar", 47.8864, 106.9057, 40, []),
  C("novosibirsk", "Novosibirsk", "Russia", "RU", "Asia/Novosibirsk", 55.0084, 82.9357, 40, []),
  C("vladivostok", "Vladivostok", "Russia", "RU", "Asia/Vladivostok", 43.1332, 131.9113, 40, []),

  /* ---------------- Oceania ---------------- */
  C("sydney", "Sydney", "Australia", "AU", "Australia/Sydney", -33.8688, 151.2093, 90, []),
  C("melbourne", "Melbourne", "Australia", "AU", "Australia/Sydney", -37.8136, 144.9631, 84, []),
  C("brisbane", "Brisbane", "Australia", "AU", "Australia/Brisbane", -27.4698, 153.0251, 72, []),
  C("perth", "Perth", "Australia", "AU", "Australia/Perth", -31.9505, 115.8605, 70, []),
  C("adelaide", "Adelaide", "Australia", "AU", "Australia/Adelaide", -34.9285, 138.6007, 62, []),
  C("darwin", "Darwin", "Australia", "AU", "Australia/Darwin", -12.4634, 130.8456, 48, []),
  C("canberra", "Canberra", "Australia", "AU", "Australia/Sydney", -35.2809, 149.13, 52, []),
  C("auckland", "Auckland", "New Zealand", "NZ", "Pacific/Auckland", -36.8485, 174.7633, 76, []),
  C("wellington", "Wellington", "New Zealand", "NZ", "Pacific/Auckland", -41.2866, 174.7756, 58, []),
  C("christchurch", "Christchurch", "New Zealand", "NZ", "Pacific/Auckland", -43.5321, 172.6362, 52, []),
  C("chatham-islands", "Chatham Islands", "New Zealand", "NZ", "Pacific/Chatham", -43.9542, -176.5601, 24, []),
  C("suva", "Suva", "Fiji", "FJ", "Pacific/Fiji", -18.1416, 178.4419, 44, ["fiji"]),
  C("nadi", "Nadi", "Fiji", "FJ", "Pacific/Fiji", -17.7765, 177.4356, 42, []),
  C("apia", "Apia", "Samoa", "WS", "Pacific/Apia", -13.8333, -171.7667, 32, ["samoa"]),
  C("papeete", "Papeete", "French Polynesia", "PF", "Pacific/Tahiti", -17.5516, -149.5585, 40, ["tahiti"]),
  C("guam", "Hagåtña", "Guam", "GU", "Pacific/Guam", 13.4745, 144.7504, 36, ["guam"]),
  C("port-moresby", "Port Moresby", "Papua New Guinea", "PG", "Pacific/Port_Moresby", -9.4438, 147.1803, 34, []),
];

export const BY_SLUG: Record<string, City> = Object.fromEntries(
  CITIES.map((c) => [c.slug, c]),
);

export function getCity(slug: string): City | undefined {
  return BY_SLUG[slug];
}

/** Cities sorted by search weight, highest first. */
export const RANKED = [...CITIES].sort((a, b) => b.rank - a.rank);

/**
 * The pairs worth pre-rendering. Ranked by the product of both cities' weights,
 * skipping pairs that share a time zone (nothing to explain) and same-country
 * pairs below a threshold.
 */
export function topPairs(limit: number): Array<[string, string]> {
  const scored: Array<{ a: City; b: City; s: number }> = [];
  for (let i = 0; i < RANKED.length; i++) {
    for (let j = 0; j < RANKED.length; j++) {
      if (i === j) continue;
      const a = RANKED[i], b = RANKED[j];
      if (a.tz === b.tz) continue;              // no time difference to teach
      scored.push({ a, b, s: a.rank * b.rank });
    }
  }
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, limit).map(({ a, b }) => [a.slug, b.slug]);
}

/** Every indexable pair, for the sitemap (both directions, different zones). */
export function allPairs(): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const a of RANKED) {
    for (const b of RANKED) {
      if (a.slug === b.slug || a.tz === b.tz) continue;
      out.push([a.slug, b.slug]);
    }
  }
  return out;
}

export function pairSlug(from: string, to: string): string {
  return `${from}-to-${to}`;
}

/** Split "san-francisco-to-new-delhi" — both halves are known slugs. */
export function parsePair(pair: string): { from: City; to: City } | null {
  const idx: number[] = [];
  let k = pair.indexOf("-to-");
  while (k !== -1) { idx.push(k); k = pair.indexOf("-to-", k + 1); }
  for (const i of idx) {
    const from = getCity(pair.slice(0, i));
    const to = getCity(pair.slice(i + 4));
    if (from && to && from.slug !== to.slug) return { from, to };
  }
  return null;
}
