// Mock data for One Crew app
export interface Profile {
  id: number;
  name: string;
  specialty: string;
  category: string;
  location: string;
  bio: string;
  about: {
    gender: string;
    age: number;
    nationality: string;
    location: string;
    height: number;
    weight: number;
    skinTone: string;
    hairColor: string;
    dialects: string[];
    willingToTravel: boolean;
  };
  skills: string[];
  stats: {
    followers: string;
    projects: number;
    likes: string;
  };
  onlineStatus: string;
  imageUrl: string;
}

export interface Company {
  id: number;
  name: string;
  specialty: string;
  category: string;
  location: string;
  about: {
    Founded: string;
    'Team Size': string;
    Website: string;
  };
  services: string[];
  stats: {
    followers: string;
    projects: number;
    likes: string;
  };
  imageUrl: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  type: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  oneDayShoot: boolean;
  status: string;
  progress: number;
  tasks: Task[];
}

export interface Task {
  id: number;
  title: string;
  service: string;
  timeline: string;
  assigned: { [key: string]: Profile[] };
  status: string;
  services: string[];
}

export interface Section {
  key: string;
  title: string;
  items: SectionItem[];
}

export interface SectionItem {
  label: string;
  users?: number;
}

export const SECTIONS: Section[] = [
  {
    key: "talent",
    title: "Talents",
    items: [
      { label: "Actor", users: 1650 },
      { label: "Singer", users: 690 },
      { label: "Dancer", users: 420 }
    ]
  },
  {
    key: "onehub",
    title: "Studios & Agencies",
    items: [
      { label: "Agency", users: 540 },
      { label: "Production Houses", users: 75 },
      { label: "Sound Studio", users: 1 },
      { label: "Post house", users: 45 },
      { label: "Location", users: 190 },
      { label: "Casting Studio", users: 340 }
    ]
  },
  {
    key: "individuals",
    title: "Crew",
    items: [
      { label: "Producer", users: 280 },
      { label: "Director", users: 410 },
      { label: "Creative Director", users: 320 },
      { label: "Writer", users: 520 },
      { label: "DOP", users: 180 },
      { label: "Art Director", users: 150 },
      { label: "Editor", users: 210 },
      { label: "Colorist", users: 130 },
      { label: "VFX Artist", users: 110 },
      { label: "Sound Designer", users: 170 },
      { label: "Sound Engineer", users: 250 },
      { label: "Composer", users: 230 },
      { label: "Ai Technical", users: 40 }
    ]
  },
  {
    key: "technicians",
    title: "Technicians",
    items: [
      { label: "Focus Puller", users: 150 },
      { label: "Camera Operator", users: 190 },
      { label: "Dolly Grip", users: 120 },
      { label: "Gaffer", users: 160 },
      { label: "Grip", users: 200 },
      { label: "Best Boy", users: 130 },
      { label: "Set Dresser", users: 110 },
      { label: "Art Director Assistant", users: 90 },
      { label: "Production Assistant", users: 300 }
    ]
  },
  {
    key: "specialized",
    title: "Special Services",
    items: [
      { label: "Printing", users: 65 },
      { label: "Costume", users: 95 },
      { label: "Transportation", users: 115 },
      { label: "Weapon Rental", users: 30 },
      { label: "Accessories & Props", users: 140 },
      { label: "Makeup", users: 210 }
    ]
  },
  {
    key: "academy",
    title: "Academy",
    items: [
      { label: "ACT", users: 95 },
      { label: "Dance", users: 140 },
      { label: "Music", users: 220 },
      { label: "Directing", users: 110 },
      { label: "Lighting", users: 85 },
      { label: "Photography", users: 170 },
      { label: "Cinematography", users: 105 },
      { label: "Singing", users: 150 },
      { label: "Writing", users: 210 },
      { label: "Workshops", users: 130 }
    ]
  },
  {
    key: "legal",
    title: "Legal",
    items: [
      { label: "Company Formation Service" },
      { label: "Commercial and Tax Registration" },
      { label: "Tax Handling / Tax Affairs" },
      { label: "Accountant Advisor" },
      { label: "Contract Drafting & Writing" },
      { label: "Public Filming Permit" },
      { label: "Drone Permit" },
      { label: "Censorship Approval" },
      { label: "Syndicate Card Renewal" }
    ]
  }
];

export const createPlaceholder = (width: number, height: number, bgColor: string, textColor: string, text: string) => 
  `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;

export const getInitials = (name: string) => {
  if (!name) return '??';
  const names = name.split(' ');
  const firstInitial = names[0]?.[0] || '';
  const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
  return `${firstInitial}${lastInitial}`.toUpperCase();
};

export interface NewsItem {
  id: number;
  title: string;
  summary: string;
  imageUrl: string;
  category: 'Marvel' | 'Netflix' | 'VR' | 'Tech';
  source?: string;
  publishedAt?: string;
}

export const MOCK_SPOT_NEWS: NewsItem[] = [
  {
    id: 1,
    title: 'Netflix Builds $1B New Jersey Studio',
    summary:
      "Netflix is building a huge new film studio in New Jersey worth $1 billion. It will include massive soundstages and create thousands of jobs, positioning it as a major production hub on the U.S. East Coast.",
    imageUrl: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=1600&auto=format&fit=crop',
    category: 'Netflix',
    source: 'One Crew Spot',
  },
  {
    id: 2,
    title: 'Marvel Teases Multiverse Saga Surprises',
    summary:
      "Marvel Studios hints at bold new crossovers and character arcs in the Multiverse Saga, with directors exploring more practical VFX and dynamic on-set LED volumes for immersive worlds.",
    imageUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?q=80&w=1600&auto=format&fit=crop',
    category: 'Marvel',
  },
  {
    id: 3,
    title: 'VR Filmmaking: From Previz to Final Pixels',
    summary:
      "Virtual production with real-time engines is reshaping previs, blocking, and editorial. Directors can scout digital sets in VR and iterate lighting, lenses, and camera moves instantly.",
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600&auto=format&fit=crop',
    category: 'VR',
  },
  {
    id: 4,
    title: 'New Tech in Cinema: AI-Assisted Color & Sound',
    summary:
      "AI-powered grading and dialogue isolation tools speed up color and post sound while keeping creative control in artists’ hands. The next wave focuses on explainable adjustments and collaboration.",
    imageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=1600&auto=format&fit=crop',
    category: 'Tech',
  },
];

export const MOCK_PROFILES_DATA: Profile[] = [
  {
    id: 1,
    name: 'Aya Mahmoud',
    specialty: 'Character Actor',
    category: 'crew',
    location: 'Cairo, EG',
    bio: "Passionate actor with 5+ years of experience in theatre and film. I bring characters to life with depth and emotion.",
    about: {
      gender: 'Female',
      age: 28,
      nationality: 'Egyptian',
      location: 'Cairo',
      height: 165,
      weight: 60,
      skinTone: 'Light',
      hairColor: 'Brown',
      dialects: ['Standard Egyptian', 'American'],
      willingToTravel: true
    },
    skills: ['Method Acting', 'Improvisation', 'Cold Reading'],
    stats: { followers: '1.2k', projects: 12, likes: '3.5k' },
    onlineStatus: 'online',
    imageUrl: ''
  },
  {
    id: 2,
    name: 'Karim Adel',
    specialty: 'Voice Actor',
    category: 'crew',
    location: 'Alexandria, EG',
    bio: "Versatile voice actor specializing in animation and commercial voice-overs. My voice is my instrument.",
    about: {
      gender: 'Male',
      age: 35,
      nationality: 'Egyptian',
      location: 'Alexandria',
      height: 180,
      weight: 85,
      skinTone: 'Medium',
      hairColor: 'Black',
      dialects: ['Classical Arabic (Fusha)', 'British', 'French'],
      willingToTravel: false
    },
    skills: ['Voice Acting', 'Dialects & Accents', 'Singing'],
    stats: { followers: '850', projects: 25, likes: '1.8k' },
    onlineStatus: 'Last seen 2h ago',
    imageUrl: ''
  },
  {
    id: 3,
    name: 'Salma Ibrahim',
    specialty: 'Theater Actress',
    category: 'crew',
    location: 'Giza, EG',
    bio: "Dedicated to the stage. I believe in the power of live performance to connect and inspire.",
    about: {
      gender: 'Female',
      age: 24,
      nationality: 'Egyptian',
      location: 'Giza',
      height: 170,
      weight: 62,
      skinTone: 'Medium',
      hairColor: 'Black',
      dialects: ['Standard Egyptian', 'Sa\'idi'],
      willingToTravel: true
    },
    skills: ['Stage Combat', 'Movement', 'Dancing'],
    stats: { followers: '2.5k', projects: 8, likes: '5.1k' },
    onlineStatus: 'online',
    imageUrl: ''
  },
  {
    id: 4,
    name: 'Omar Hassan',
    specialty: 'Film Actor',
    category: 'crew',
    location: 'Cairo, EG',
    bio: "Experienced film actor with a passion for storytelling. I bring authenticity to every role.",
    about: {
      gender: 'Male',
      age: 32,
      nationality: 'Egyptian',
      location: 'Cairo',
      height: 175,
      weight: 75,
      skinTone: 'Olive',
      hairColor: 'Black',
      dialects: ['Standard Egyptian', 'American'],
      willingToTravel: true
    },
    skills: ['Film Acting', 'Character Development', 'Emotional Range'],
    stats: { followers: '3.2k', projects: 18, likes: '7.8k' },
    onlineStatus: 'online',
    imageUrl: ''
  },
  {
    id: 5,
    name: 'Nour El-Din',
    specialty: 'Commercial Actor',
    category: 'crew',
    location: 'Dubai, UAE',
    bio: "Professional commercial actor with extensive experience in TV commercials and brand campaigns.",
    about: {
      gender: 'Male',
      age: 29,
      nationality: 'Emirati',
      location: 'Dubai',
      height: 178,
      weight: 72,
      skinTone: 'Medium',
      hairColor: 'Brown',
      dialects: ['Emirati', 'English', 'Standard Egyptian'],
      willingToTravel: true
    },
    skills: ['Commercial Acting', 'Brand Representation', 'Screen Presence'],
    stats: { followers: '1.8k', projects: 35, likes: '4.2k' },
    onlineStatus: 'Last seen 1h ago',
    imageUrl: ''
  },
  {
    id: 6,
    name: 'Mona Farouk',
    specialty: 'Drama Actress',
    category: 'crew',
    location: 'Cairo, EG',
    bio: "Award-winning drama actress known for powerful performances in television series and films.",
    about: {
      gender: 'Female',
      age: 31,
      nationality: 'Egyptian',
      location: 'Cairo',
      height: 168,
      weight: 58,
      skinTone: 'Fair',
      hairColor: 'Black',
      dialects: ['Standard Egyptian', 'Classical Arabic (Fusha)'],
      willingToTravel: false
    },
    skills: ['Drama Acting', 'Emotional Depth', 'Character Transformation'],
    stats: { followers: '5.7k', projects: 22, likes: '12.3k' },
    onlineStatus: 'online',
    imageUrl: ''
  },
  {
    id: 7,
    name: 'Ahmed Zaki',
    specialty: 'Comedy Actor',
    category: 'crew',
    location: 'Alexandria, EG',
    bio: "Comedy specialist with a natural talent for making people laugh. Perfect timing and delivery.",
    about: {
      gender: 'Male',
      age: 26,
      nationality: 'Egyptian',
      location: 'Alexandria',
      height: 172,
      weight: 68,
      skinTone: 'Medium',
      hairColor: 'Black',
      dialects: ['Standard Egyptian', 'Alexandrian'],
      willingToTravel: true
    },
    skills: ['Comedy Acting', 'Timing', 'Physical Comedy'],
    stats: { followers: '2.1k', projects: 15, likes: '6.5k' },
    onlineStatus: 'Last seen 30m ago',
    imageUrl: ''
  },
  {
    id: 8,
    name: 'Layla El-Masry',
    specialty: 'Lead Actress',
    category: 'crew',
    location: 'Cairo, EG',
    bio: "Versatile lead actress with experience in both film and television. Known for strong character portrayals.",
    about: {
      gender: 'Female',
      age: 27,
      nationality: 'Egyptian',
      location: 'Cairo',
      height: 165,
      weight: 55,
      skinTone: 'Light',
      hairColor: 'Brown',
      dialects: ['Standard Egyptian', 'American', 'British'],
      willingToTravel: true
    },
    skills: ['Lead Acting', 'Character Development', 'Screen Chemistry'],
    stats: { followers: '4.3k', projects: 20, likes: '9.1k' },
    onlineStatus: 'online',
    imageUrl: ''
  }
];

export const MOCK_PROFILES = MOCK_PROFILES_DATA.map(profile => ({
  ...profile,
  imageUrl: createPlaceholder(400, 600, '000000', 'FFFFFF', getInitials(profile.name))
}));

export const MOCK_PROJECTS_DATA: Project[] = [
  {
    id: 1,
    title: "Stranger Things",
    description: "In the 1980s, a young boy disappears from a small town called Hawkins. His friends, family, and the local police uncover strange supernatural forces and secret government experiments.",
    type: "Film",
    startDate: "2025-08-01",
    endDate: "2025-10-31",
    deliveryDate: "2025-12-15",
    oneDayShoot: false,
    status: "In Production",
    progress: 65,
    tasks: [
      {
        id: 1,
        title: "Lead Actor Casting",
        service: "Casting Studio",
        timeline: "2025-08-10 - 2025-08-15",
        assigned: { "Actor": [MOCK_PROFILES[0], MOCK_PROFILES[2]], "Casting Studio": [] },
        status: "Completed",
        services: ["Actor", "Casting Studio"]
      },
      {
        id: 2,
        title: "Scout Desert Locations",
        service: "Location",
        timeline: "2025-08-12 - 2025-08-18",
        assigned: { "Location": [MOCK_PROFILES[1]] },
        status: "In Progress",
        services: ["Location"]
      }
    ]
  }
];

// Project Creation Mock Data
export const PROJECT_TYPES = [
  { id: 'film', name: 'Film', description: 'Feature film or short film' },
  { id: 'series', name: 'Series', description: 'Television series or web series' },
  { id: 'commercial', name: 'Commercial', description: 'Advertisement or promotional content' },
  { id: 'music_video', name: 'Music Video', description: 'Music video production' },
  { id: 'documentary', name: 'Documentary', description: 'Documentary film' },
  { id: 'event', name: 'Event', description: 'Live event or corporate video' },
];

export const PROJECT_STAGES = [
  {
    id: 'development',
    name: 'Development',
    description: 'Script writing, concept development, and pre-planning',
    order: 1,
    isSelected: false,
  },
  {
    id: 'pre_production',
    name: 'Pre-production',
    description: 'Casting, location scouting, and production planning',
    order: 2,
    isSelected: false,
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Principal photography and filming',
    order: 3,
    isSelected: false,
  },
  {
    id: 'post_production',
    name: 'Post-production',
    description: 'Editing, sound design, and visual effects',
    order: 4,
    isSelected: false,
  },
  {
    id: 'distribution',
    name: 'Distribution',
    description: 'Marketing, release, and distribution',
    order: 5,
    isSelected: false,
  },
];

export const TASK_TO_SERVICE_SUGGESTIONS = {
  development: [
    { role: 'Writer', service: 'Screenwriter' },
    { role: 'Director', service: 'Director' },
    { role: 'Producer', service: 'Producer' },
    { role: 'Script Consultant', service: 'Script Consultant' },
  ],
  pre_production: [
    { role: 'Casting Director', service: 'Casting Director' },
    { role: 'Actor', service: 'Actor' },
    { role: 'Location Scout', service: 'Location Scout' },
    { role: 'Production Designer', service: 'Production Designer' },
    { role: 'Costume Designer', service: 'Costume Designer' },
  ],
  production: [
    { role: 'Director', service: 'Director' },
    { role: 'Cinematographer', service: 'Cinematographer' },
    { role: 'Actor', service: 'Actor' },
    { role: 'Sound Engineer', service: 'Sound Engineer' },
    { role: 'Gaffer', service: 'Gaffer' },
    { role: 'Grip', service: 'Grip' },
  ],
  post_production: [
    { role: 'Editor', service: 'Editor' },
    { role: 'Sound Designer', service: 'Sound Designer' },
    { role: 'Colorist', service: 'Colorist' },
    { role: 'VFX Artist', service: 'VFX Artist' },
    { role: 'Composer', service: 'Composer' },
  ],
  distribution: [
    { role: 'Marketing Manager', service: 'Marketing Manager' },
    { role: 'Publicist', service: 'Publicist' },
    { role: 'Distributor', service: 'Distributor' },
    { role: 'Film Festival Coordinator', service: 'Film Festival Coordinator' },
  ],
};

export const FILTER_OPTIONS = {
  age: [
    { label: '18-25', value: '18-25' },
    { label: '26-35', value: '26-35' },
    { label: '36-45', value: '36-45' },
    { label: '46-55', value: '46-55' },
    { label: '55+', value: '55+' },
  ],
  gender: [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Non-binary', value: 'non-binary' },
    { label: 'Any', value: 'any' },
  ],
  location: [
    { label: 'New York', value: 'new_york' },
    { label: 'Los Angeles', value: 'los_angeles' },
    { label: 'London', value: 'london' },
    { label: 'Toronto', value: 'toronto' },
    { label: 'Remote', value: 'remote' },
  ],
  experience: [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Experienced', value: 'experienced' },
    { label: 'Expert', value: 'expert' },
  ],
};

export const SERVICE_FILTERS = {
  actor: ['age', 'gender', 'location', 'experience', 'dialects', 'special_skills'],
  director: ['location', 'experience', 'specializations'],
  cinematographer: ['location', 'experience', 'equipment_specialties'],
  editor: ['location', 'experience', 'software_skills'],
  producer: ['location', 'experience', 'budget_range'],
};
