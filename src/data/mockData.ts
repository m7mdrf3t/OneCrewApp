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
