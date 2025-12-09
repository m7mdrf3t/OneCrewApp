import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useSpring, useTransform, useMotionValue } from "framer-motion";
import {
    Sparkles, GraduationCap, Clapperboard, Users as UsersIcon, Gavel,
    Film, Music, PenLine, MapPin, Camera, Printer, Activity, Mic,
    Lightbulb, Building2, Gem, Scissors, Search, SlidersHorizontal,
    Home, User, FolderClosed, MoreHorizontal, Bell, MessageCircle as MessageCircleIcon, ArrowLeft, ChevronDown, X,
    Cake, Globe, Plus, Heart, Phone, Mail, Award, Briefcase, Image as ImageIcon, Video, Mic2,
    Mars, Venus, Check, Star, Clock, ToggleRight, MoreVertical, Sun, Moon, Paperclip, Send, PlayCircle, PauseCircle, Volume2, VolumeX, Settings,
    Instagram, Linkedin, Twitter, Facebook, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Minus, ArrowUpDown, Palette, Calendar, Hash, Tag, Ticket, Store, UserPlus, FileText, ShieldCheck, Airplay, Wallet, Building, PartyPopper, Trophy, KeyRound, AtSign, ArrowRight as ArrowRightIcon, Edit3, BrainCircuit, LifeBuoy, Trash2, RefreshCw,
    Link, Newspaper, Share2,
    Shield, HelpCircle, MessageSquare, Languages, LogOut, LogIn, ChevronRight
} from "lucide-react";

// --- Icons & Data ---
const SECTION_ICONS = { onehub: Building, talent: UsersIcon, individuals: UsersIcon, specialized: Sparkles, academy: GraduationCap, legal: Gavel, technicians: UsersIcon };
const ITEM_ICONS = {
    "Production Houses": Building,
    "Location": MapPin,
    "Casting Studio": UserPlus,
    Agency: Building2, "Creative Director": Clapperboard, Director: Clapperboard, Author: PenLine, Writer: PenLine, Composer: Music,
    Producer: Trophy,
    ACT: Clapperboard, Dance: Activity, Music: Music, Directing: Clapperboard, Lighting: Lightbulb, Photography: Camera,
    Cinematography: Film, Singing: Mic, Writing: PenLine, Workshops: GraduationCap,
    "Company Formation Service": Building,
    "Commercial and Tax Registration": FileText,
    "Tax Handling / Tax Affairs": Wallet,
    "Accountant Advisor": LifeBuoy,
    "Contract Drafting & Writing": PenLine,
    "Public Filming Permit": FileText,
    "Drone Permit": Airplay,
    "Censorship Approval": ShieldCheck,
    "Syndicate Card Renewal": User,
    "Post house": Building2,
    "Editor": Scissors,
    "Colorist": Palette,
    "VFX Artist": Gem,
    "Sound Designer": Music,
    "Sound Studio": Building2,
    "Sound Engineer": Mic,
    "Boom Operator": Mic,
    "Sound Mixer": Mic,
};

const SECTIONS = [
    { key: "talent", title: "Talents", items: [
        { label: "Actor", users: 1650 }, { label: "Singer", users: 690 }, { label: "Dancer", users: 420 }
    ]},
    { key: "onehub", title: "Studios & Agencies", items: [
        { label: "Agency", users: 540 },
        { label: "Production Houses", users: 75 },
        { label: "Sound Studio", users: 1 },
        { label: "Post house", users: 45 },
        { label: "Location", users: 190 },
        { label: "Casting Studio", users: 340 },
    ]},
    { key: "individuals", title: "Crew", items: [
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
    ]},
    { key: "technicians", title: "Technicians", items: [
        { label: "Focus Puller", users: 150 },
        { label: "Camera Operator", users: 190 },
        { label: "Dolly Grip", users: 120 },
        { label: "Gaffer", users: 160 },
        { label: "Grip", users: 200 },
        { label: "Best Boy", users: 130 },
        { label: "Set Dresser", users: 110 },
        { label: "Art Director Assistant", users: 90 },
        { label: "Production Assistant", users: 300 }
    ] },
    { key: "specialized", title: "Special Services", items: [
        { label: "Printing", users: 65 },
        { label: "Costume", users: 95 },
        { label: "Transportation", users: 115 },
        { label: "Weapon Rental", users: 30 },
        { label: "Accessories & Props", users: 140 },
        { label: "Makeup", users: 210 },
    ] },
    { key: "academy", title: "Academy", items: [ { label: "ACT", users: 95 }, { label: "Dance", users: 140 }, { label: "Music", users: 220 }, { label: "Directing", users: 110 }, { label: "Lighting", users: 85 }, { label: "Photography", users: 170 }, { label: "Cinematography", users: 105 }, { label: "Singing", users: 150 }, { label: "Writing", users: 210 }, { label: "Workshops", users: 130 } ]},
    { key: "legal", title: "Legal", items: [
            { label: "Company Formation Service" },
            { label: "Commercial and Tax Registration" },
            { label: "Tax Handling / Tax Affairs" },
            { label: "Accountant Advisor" },
            { label: "Contract Drafting & Writing" },
            { label: "Public Filming Permit" },
            { label: "Drone Permit" },
            { label: "Censorship Approval" },
            { label: "Syndicate Card Renewal" }
    ]},
];

const ALL_SERVICE_LABELS = SECTIONS.flatMap(s => s.items.map(i => i.label));
const COMPANY_SERVICES = ["Production Houses", "Agency", "Location", "Printing", "Transportation", "Casting Studio", "Accessories & Props", "Costume", "Post house", "Sound Studio", "Weapon Rental", "Makeup"];
const STUDIO_CATEGORIES = ["Casting Studio", "Sound Studio", "Post house", "Production Houses"];
const MOCK_LEGAL_SERVICES = {
    "Company Formation Service": {
        description: "Comprehensive service to help you establish your new production company, handling all legal and administrative steps.",
        procedures: ["Define company structure", "Prepare legal documents", "Register with authorities"],
        contact: { name: "One Crew Legal Team", phone: "N/A", address: "N/A", website: "one-crew.com" },
        costs: { total: "Varies", breakdown: [ { item: "Consultation Fee", price: "Contact for quote" } ] }
    },
    "Commercial and Tax Registration": {
        description: "Assistance with obtaining the necessary commercial and tax registrations for your business to operate legally.",
        procedures: ["Prepare required documents", "Submit to Commercial Registry Office", "Obtain Tax ID card"],
        contact: { name: "One Crew Legal Team", phone: "N/A", address: "N/A", website: "one-crew.com" },
        costs: { total: "Varies", breakdown: [ { item: "Service Fee", price: "Contact for quote" } ] }
    },
    "Tax Handling / Tax Affairs": {
        description: "Managing all tax-related matters for your company, ensuring compliance and optimizing your tax position.",
        procedures: ["Bookkeeping and record maintenance", "Filing tax returns", "Handling tax audits"],
        contact: { name: "One Crew Legal Team", phone: "N/A", address: "N/A", website: "one-crew.com" },
        costs: { total: "Varies", breakdown: [ { item: "Monthly Retainer", price: "Contact for quote" } ] }
    },
    "Accountant Advisor": {
        description: "Expert financial advice from certified accountants to help you manage your finances, budget for projects, and make sound financial decisions.",
        procedures: ["Financial health assessment", "Budgeting and forecasting", "Strategic financial planning"],
        contact: { name: "One Crew Legal Team", phone: "N/A", address: "N/A", website: "one-crew.com" },
        costs: { total: "Varies", breakdown: [ { item: "Consultation Fee", price: "Contact for quote" } ] }
    },
    "Contract Drafting & Writing": {
        description: "Professional drafting and review of all types of contracts, including crew, talent, location, and distribution agreements.",
        procedures: ["Initial consultation", "Drafting of contract", "Review and revisions"],
        contact: { name: "One Crew Legal Team", phone: "N/A", address: "N/A", website: "one-crew.com" },
        costs: { total: "Varies", breakdown: [ { item: "Per Contract Fee", price: "Contact for quote" } ] }
    },
    "Public Filming Permit": {
        description: "Required for filming in public spaces, streets, and government-managed locations. Ensures compliance with local regulations.",
        procedures: ["Submit official request letter", "Provide script and storyboard", "List of crew and equipment", "Pay associated fees"],
        contact: { name: "Ministry of Culture - Filming Permits Office", phone: "02-2735-1234", address: "1 Shagaret Al Dorr, Zamalek, Cairo", website: "moc.gov.eg" },
        costs: { total: "3,500 EGP (approx.)", breakdown: [ { item: "Application Fee", price: "500 EGP" }, { item: "Location Fee (per day)", price: "2,000 EGP" }, { item: "Administrative Stamp", price: "1,000 EGP" }, ] }
    },
    "Drone Permit": {
        description: "A special permit required for operating unmanned aerial vehicles (drones) for filming purposes. Subject to strict security and aviation regulations.",
        procedures: ["Submit drone specifications and operator license", "Provide detailed flight plan and purpose", "Obtain security clearance", "Pay permit fees"],
        contact: { name: "Ministry of Defense & Civil Aviation Authority", phone: "02-2267-5678", address: "Airport Road, Cairo", website: "civilaviation.gov.eg" },
        costs: { total: "10,000 EGP (approx.)", breakdown: [ { item: "Security Clearance Application", price: "5,000 EGP" }, { item: "Aviation Authority Fee", price: "5,000 EGP" }, ] }
    },
    "Censorship Approval": {
        description: "Mandatory review of scripts and final cuts for films, series, and advertisements to ensure content adheres to national media standards.",
        procedures: ["Submit final script for pre-approval", "Submit final edited version for review", "Implement any required edits", "Receive official approval stamp"],
        contact: { name: "Authority for Censorship on Artistic Works", phone: "02-3338-9876", address: "123 Al Haram St, Giza", website: "censorship.gov.eg" },
        costs: { total: "2,000 EGP per hour of content", breakdown: [ { item: "Script Review Fee", price: "500 EGP" }, { item: "Final Cut Review Fee (per hour)", price: "1,500 EGP" }, ] }
    },
    "Syndicate Card Renewal": {
        description: "Annual renewal of membership cards for professionals in cinematic, theatrical, and musical syndicates, required for legal work eligibility.",
        procedures: ["Provide proof of recent work", "Submit previous year's card", "Pay annual syndicate fees", "Update personal information"],
        contact: { name: "Actors' Syndicate", phone: "02-2578-1122", address: "1 Champollion St, Downtown Cairo", website: "actors-syndicate.eg" },
        costs: { total: "800 EGP", breakdown: [ { item: "Annual Membership Fee", price: "750 EGP" }, { item: "Stamp and Admin Fees", price: "50 EGP" }, ] }
    }
};
const SKIN_TONE_COLORS = [
    { name: 'Fair', hex: '#F8E6E0' },
    { name: 'Light', hex: '#F3D5C1' },
    { name: 'Medium', hex: '#D1A388' },
    { name: 'Olive', hex: '#A87C5F' },
    { name: 'Dark', hex: '#6D4C3A' },
];
const HAIR_COLORS = [
    { name: 'Black', hex: '#000000' },
    { name: 'Brown', hex: '#654321' },
    { name: 'Blonde', hex: '#F0E68C' },
    { name: 'Red', hex: '#FF4500' },
    { name: 'Grey', hex: '#808080' },
];
const DIALECTS = {
    "English": ["American", "British"],
    "European": ["French", "German", "Italian", "Russian", "Spanish"],
    "Egyptian Arabic": ["Standard Egyptian", "Sa'idi", "Fallahi", "Classical Arabic (Fusha)"],
    "Levantine Arabic": ["Syrian", "Lebanese", "Jordanian", "Palestinian"],
    "Gulf Arabic": ["Saudi", "Emirati", "Kuwaiti", "Bahraini", "Omani"],
    "Other Arabic": ["Iraqi", "Yemeni", "Libyan", "Tunisian", "Algerian", "Moroccan", "Sudanese"]
};
const ALL_DIALECTS = Object.values(DIALECTS).flat();
const FILTER_ICONS = { gender: UsersIcon, age: Cake, nationality: Globe, location: MapPin, skills: Sparkles, height: ArrowUpDown, weight: ArrowUpDown, awards: Award, skinTone: Palette, hairColor: Scissors, specialty: Briefcase, dialects: Mic2, willingToTravel: Send };
const FILTER_OPTIONS = {
    gender: ['Male', 'Female'],
    age: { type: 'range', min: 0, max: 99 },
    nationality: ['Egyptian', 'Saudi Arabian', 'Emirati', 'Kuwaiti', 'Lebanese', 'American', 'British'],
    location: ['Cairo', 'Giza', 'Alexandria', 'Dubai', 'Riyadh', 'Beirut'],
    skills: ['Method Acting', 'Improvisation', 'Stage Combat', 'Voice Acting', 'Dialects & Accents'],
    height: { type: 'range', min: 120, max: 220 },
    weight: { type: 'range', min: 40, max: 150 },
    awards: ['Best Actor', 'Top Performer', 'Rising Star'],
    skinTone: SKIN_TONE_COLORS,
    hairColor: HAIR_COLORS,
    dialects: ALL_DIALECTS,
    specialty: ['Film Production', 'Post-production', 'Distribution & Marketing', 'Commercials', 'Animation'],
};
const SERVICE_FILTERS = {
    // Unified Individual Filters
    Actor: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Dancer: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Singer: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    "Creative Director": ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Director: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Producer: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Writer: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Composer: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    DOP: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    "Art Director": ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Makeup: ['specialty', 'location'],
    "Sound Engineer": ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    "Sound Designer": ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Editor: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    Colorist: ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],
    "VFX Artist": ['age', 'height', 'weight', 'gender', 'skinTone', 'hairColor', 'nationality', 'location', 'willingToTravel', 'skills', 'dialects', 'awards'],

    // Company & Service Filters
    "Production Houses": ['specialty', 'location'],
    "Post house": ['specialty', 'location'],
    Agency: ['specialty', 'location'],
    "Sound Studio": ['specialty', 'location'],
    Printing: ['specialty', 'location'],
    "Casting Studio": ['specialty', 'location'],
    Costume: ['specialty', 'location'],
    Location: ['location'],
    Transportation: ['specialty', 'location'],
    "Weapon Rental": ['specialty', 'location'],
    "Accessories & Props": ['specialty', 'location'],
};
const STORE_CATEGORIES = ["Cameras", "Lighting", "Audio", "Screens", "Accessories"];
const STORE_BRANDS = ["Sony", "Panasonic", "Canon", "Nikon", "Sennheiser", "Rode", "Arri", "DJI"];
const createPlaceholder = (width, height, bgColor, textColor, text) => `https://placehold.co/${width}x${height}/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
const getInitials = (name) => {
    if (!name) return '??';
    const names = name.split(' ');
    const firstInitial = names[0]?.[0] || '';
    const lastInitial = names.length > 1 ? names[names.length - 1]?.[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
};
const MOCK_PROFILES_DATA = [
    { id: 1, name: 'Aya Mahmoud', specialty: 'Character Actor', category: 'crew', location: 'Cairo, EG', bio: "Passionate actor with 5+ years of experience in theatre and film. I bring characters to life with depth and emotion.", about: { gender: 'Female', age: 28, nationality: 'Egyptian', location: 'Cairo', height: 165, weight: 60, skinTone: 'Light', hairColor: 'Brown', dialects: ['Standard Egyptian', 'American'], willingToTravel: true }, skills: ['Method Acting', 'Improvisation', 'Cold Reading'], stats: { followers: '1.2k', projects: 12, likes: '3.5k' }, onlineStatus: 'online' },
    { id: 2, name: 'Karim Adel', specialty: 'Voice Actor', category: 'crew', location: 'Alexandria, EG', bio: "Versatile voice actor specializing in animation and commercial voice-overs. My voice is my instrument.", about: { gender: 'Male', age: 35, nationality: 'Egyptian', location: 'Alexandria', height: 180, weight: 85, skinTone: 'Medium', hairColor: 'Black', dialects: ['Classical Arabic (Fusha)', 'British', 'French'], willingToTravel: false }, skills: ['Voice Acting', 'Dialects & Accents', 'Singing'], stats: { followers: '850', projects: 25, likes: '1.8k' }, onlineStatus: 'Last seen 2h ago' },
    { id: 3, name: 'Salma Ibrahim', specialty: 'Theater Actress', category: 'crew', location: 'Giza, EG', bio: "Dedicated to the stage. I believe in the power of live performance to connect and inspire.", about: { gender: 'Female', age: 24, nationality: 'Egyptian', location: 'Giza', height: 170, weight: 62, skinTone: 'Medium', hairColor: 'Black', dialects: ['Standard Egyptian', 'Sa\'idi'], willingToTravel: true }, skills: ['Stage Combat', 'Movement', 'Dancing'], stats: { followers: '2.5k', projects: 8, likes: '5.1k' }, onlineStatus: 'online' },
    { id: 4, name: 'Omar Hassan', specialty: 'Stunt Coordinator', category: 'crew', location: 'Cairo, EG', bio: "Safety first, action second. I design and coordinate stunts that are both thrilling and safe.", about: { gender: 'Male', age: 42, nationality: 'Egyptian', location: 'Cairo', height: 185, weight: 90, skinTone: 'Olive', hairColor: 'Brown', dialects: ['Standard Egyptian'], willingToTravel: false }, skills: ['Stunts', 'Firearms Handling', 'Fencing'], stats: { followers: '500', projects: 31, likes: '980' }, onlineStatus: 'offline' },
    { id: 5, name: 'Layla El-Masry', specialty: 'Creative Director', category: 'creative', location: 'Luxor, EG', bio: "I craft compelling narratives and visual concepts that resonate with audiences.", about: { gender: 'Female', age: 31, nationality: 'Lebanese', location: 'Luxor', height: 168, weight: 58, skinTone: 'Fair', hairColor: 'Blonde', dialects: ['Lebanese', 'Syrian', 'American'], willingToTravel: true }, skills: ['Improvisation', 'Comedy', 'Script Analysis'], stats: { followers: '10k', projects: 18, likes: '12.3k' }, onlineStatus: 'Last seen 15m ago'},
    { id: 6, name: 'Ahmed Zaki', specialty: 'DOP', category: 'production', location: 'Aswan, EG', bio: "Painting with light is my passion. Experienced cinematographer for features, series, and commercials.", about: { gender: 'Male', age: 50, nationality: 'Saudi', location: 'Aswan', height: 178, weight: 80, skinTone: 'Olive', hairColor: 'Grey', dialects: ['Saudi', 'Emirati', 'Kuwaiti'], willingToTravel: true }, skills: ['Cinematography', 'Lighting', 'Color Grading'], stats: { followers: '4.2k', projects: 45, likes: '8.9k' }, onlineStatus: 'online' },
];
const MOCK_PROFILES = MOCK_PROFILES_DATA.map(profile => ({ ...profile, imageUrl: createPlaceholder(400, 600, '000000', 'FFFFFF', getInitials(profile.name)) }));
const MOCK_COMPANIES_DATA = [
    // Post Houses (Category: "Post house")
    { id: 101, name: 'Aroma', specialty: 'Post-production', category: 'Post house', location: 'Giza, EG', about: { Founded: '2008', 'Team Size': '60+', Website: 'aroma-studios.com' }, services: ['VFX', 'CGI', 'Editing'], stats: { followers: '30k', projects: 250, likes: '18k' } },
    { id: 102, name: 'Vivid', specialty: 'Post-production', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2017', 'Team Size': '15+', Website: 'vividstudios.net' }, services: ['Color Grading', 'Finishing'], stats: { followers: '3k', projects: 60, likes: '1.5k' } },
    { id: 103, name: 'Shift Studio', specialty: 'Post-production', category: 'Post house', location: 'Giza, EG', about: { Founded: '2014', 'Team Size': '35+', Website: 'shift-studio.com' }, services: ['VFX', 'Editing', 'Animation'], stats: { followers: '18k', projects: 180, likes: '10k' } },
    { id: 104, name: 'BigBang', specialty: 'Post-production', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2011', 'Team Size': '25+', Website: 'bigbang.film' }, services: ['Editing', 'Color Grading', 'Sound Mix'], stats: { followers: '10k', projects: 100, likes: '6k' } },
    { id: 105, name: 'Barber Shop', specialty: 'VFX & Color Grading', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2016', 'Team Size': '20+', Website: 'barbershop.vfx' }, services: ['VFX', 'Color Grading', 'Beauty Work'], stats: { followers: '9k', projects: 130, likes: '5.5k' } },
    { id: 106, name: 'Circle', specialty: 'Post-production', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2019', 'Team Size': '20+', Website: 'circlepost.com' }, services: ['Editing', 'Sound Design', 'Motion Graphics'], stats: { followers: '5k', projects: 50, likes: '2k' } },
    { id: 107, name: 'Diggers Media', specialty: 'Post-production', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2012', 'Team Size': '40+', Website: 'diggers.media' }, services: ['Editing', 'Color Grading', 'Animation'], stats: { followers: '15k', projects: 120, likes: '7k' } },
    { id: 108, name: 'Mercury Visual Solutions', specialty: 'VFX & Color Grading', category: 'Post house', location: 'Cairo, EG', about: { Founded: '2018', 'Team Size': '25+', Website: 'mercuryvfx.com' }, services: ['VFX', 'Color Grading', 'Motion Graphics'], stats: { followers: '8k', projects: 90, likes: '4k' } },
    // Agencies (Category: "Agency")
    { id: 109, name: 'Tarek Nour Communications', specialty: 'Advertising Agency', category: 'Agency', location: 'Cairo, EG', about: { Founded: '1979', 'Team Size': '200+', Website: 'tarek-nour.com' }, services: ['Advertising', 'Marketing Strategy', 'Branding'], stats: { followers: '100k', projects: 1000, likes: '50k' } },
    { id: 110, name: 'FP7 McCann Cairo', specialty: 'Advertising Agency', category: 'Agency', location: 'Cairo, EG', about: { Founded: '1960s', 'Team Size': '150+', Website: 'fp7mccann.com' }, services: ['Creative Campaigns', 'Digital Marketing', 'Public Relations'], stats: { followers: '80k', projects: 800, likes: '45k' } },
    { id: 111, name: 'Leo Burnett Cairo', specialty: 'Advertising Agency', category: 'Agency', location: 'Giza, EG', about: { Founded: '1990s', 'Team Size': '100+', Website: 'leoburnett.com' }, services: ['Integrated Communications', 'Brand Building', 'Social Media'], stats: { followers: '75k', projects: 600, likes: '40k' } },
    { id: 112, name: 'Good People Content', specialty: 'Content Creation', category: 'Agency', location: 'Cairo, EG', about: { Founded: '2015', 'Team Size': '50+', Website: 'goodpeople.film' }, services: ['Content Strategy', 'Video Production', 'Branded Content'], stats: { followers: '40k', projects: 200, likes: '25k' } },
    // Production Houses (Category: "Production Houses")
    { id: 113, name: 'Orca Production', specialty: 'Film & Commercial Production', category: 'Production Houses', location: 'Cairo, EG', about: { Founded: '2016', 'Team Size': '45+', Website: 'orcaproduction.com' }, services: ['Commercials', 'Feature Films', 'Music Videos'], stats: { followers: '35k', projects: 150, likes: '22k' } },
    { id: 114, name: 'Lighthouse Films', specialty: 'Film Production', category: 'Production Houses', location: 'Cairo, EG', about: { Founded: '2010', 'Team Size': '50+', Website: 'lighthouse.film' }, services: ['Cinematography', 'Post-production', 'VFX'], stats: { followers: '25.k', projects: 80, likes: '15k' } },
    { id: 115, name: 'The Producers', specialty: 'Film & TV Production', category: 'Production Houses', location: 'Cairo, EG', about: { Founded: '2008', 'Team Size': '70+', Website: 'theproducers.tv' }, services: ['Feature Films', 'TV Series', 'Commercials'], stats: { followers: '60k', projects: 120, likes: '30k' } },
    { id: 116, name: 'Kay-Oh', specialty: 'Commercial Production', category: 'Production Houses', location: 'Giza, EG', about: { Founded: '2018', 'Team Size': '30+', Website: 'kayoh.productions' }, services: ['Commercials', 'Branded Content'], stats: { followers: '28k', projects: 90, likes: '18k' } },
    { id: 117, name: 'Key Films', specialty: 'Film Production', category: 'Production Houses', location: 'Cairo, EG', about: { Founded: '2015', 'Team Size': '25+', Website: 'keyfilms.net' }, services: ['Feature Films', 'Short Films'], stats: { followers: '19k', projects: 40, likes: '12k' } },
    { id: 118, name: 'Animation', specialty: 'Animation', category: 'Production Houses', location: 'Cairo, EG', about: { Founded: '2017', 'Team Size': '50+', Website: 'animationhouse.com' }, services: ['2D Animation', '3D Animation', 'Motion Graphics'], stats: { followers: '45k', projects: 110, likes: '28k' } },
    { id: 119, name: 'Butter Films', specialty: 'Commercial & Digital Content', category: 'Production Houses', location: 'Giza, EG', about: { Founded: '2019', 'Team Size': '20+', Website: 'butterfilms.tv' }, services: ['Digital Ads', 'Social Media Content', 'Commercials'], stats: { followers: '15k', projects: 75, likes: '10k' } },
    // Sound Studios (Category: "Sound Studio")
    { id: 120, name: 'The Garage', specialty: 'Sound Recording & Mixing', category: 'Sound Studio', location: 'Cairo, EG', about: { Founded: '2020', 'Team Size': '5+', Website: 'thegarage.audio' }, services: ['Voice Over Recording', 'Sound Mix', 'ADR'], stats: { followers: '7k', projects: 90, likes: '4.5k' } },
    { id: 121, name: 'The Casting Hub', specialty: 'Talent Casting', category: 'Casting Studio', location: 'Cairo, EG', about: { Founded: '2015', 'Team Size': '10+', Website: 'thecastinghub.com' }, services: ['Actor Casting', 'Extras Casting', 'Voice Over Casting'], stats: { followers: '12k', projects: 300, likes: '9k' } },
];
const MOCK_COMPANIES = MOCK_COMPANIES_DATA.map(company => ({ ...company, imageUrl: createPlaceholder(800, 400, '1a1a1a', 'FFFFFF', company.name) }));

const MOCK_AGENDA = {
    'SU': [],
    'MO': [
        { id: 'mo-1', title: "Dentist", time: '9:00 AM - 1:00 PM', inTime: '09:00', outTime: '13:00', location: 'Downtown Cairo', description: 'Dentist appointment.', attendees: [MOCK_PROFILES[4], MOCK_PROFILES[5]], status: 'Pending', isCollapsed: true, type: 'personal' },
        { id: 'mo-5', title: "Voice Over Recording Session", time: '1:00 PM - 4:00 PM', inTime: '13:00', outTime: '16:00', location: 'The Garage', description: 'Recording for the new radio ad.', attendees: [MOCK_PROFILES[1], MOCK_PROFILES[0]], status: 'Pending', isCollapsed: true },
        { id: 'mo-3', title: "Cinema", time: '9:00 PM - 11:00 PM', inTime: '21:00', outTime: '23:00', location: 'One Crew Office', description: 'Going to the cinema.', attendees: [MOCK_PROFILES[2]], status: 'Pending', isCollapsed: true, type: 'personal' },
    ],
    'TU': [],
    'WE': [ // Wednesday
        { id: 'we-1', title: 'Commercial Shoot Day 1', time: '6:00 AM - 6:00 PM', inTime: '06:00', outTime: '18:00', location: 'Desert Road Studio', description: 'Full day of shooting for the new car commercial.', attendees: [MOCK_PROFILES[0], MOCK_PROFILES[5], MOCK_PROFILES[3]], status: 'In Progress', isCollapsed: true },
    ],
    'TH': [],
    'FR': [],
    'SA': []
};

const MOCK_CONVERSATIONS = [
    { id: 1, user: MOCK_PROFILES[0], lastMessage: 'Sounds interesting! Can you send over the script?', time: '10:32 AM', unread: 0 },
    { id: 2, user: MOCK_PROFILES[3], lastMessage: 'Yes, I am available on those dates.', time: 'Yesterday', unread: 2 },
    { id: 3, user: MOCK_PROFILES[4], lastMessage: 'Great, looking forward to it.', time: 'Aug 19', unread: 0 },
];
const TASK_TO_SERVICE_SUGGESTIONS = {
    "Development": ["Writer", "Author", "Producer", "Task Admins"],
    "Pre-production": ["Casting Studio", "Actor", "Singer", "Dancer", "Location", "Art Director", "Creative Director", "Director", "DOP", "Set Dresser", "Art Director Assistant", "Production Assistant", "Task Admins"],
    "Production": ["DOP", "Camera Operator", "Focus Puller", "Grip", "Gaffer", "Director", "Producer", "Production Assistant", "Boom Operator"],
    "Post-production": ["Post house", "Editor", "Colorist", "VFX Artist", "Sound Designer", "Sound Engineer", "Sound Mixer", "Sound Studio", "Ai Technical"],
    "Distribution": ["Agency"],
};
const MOCK_PROJECTS_DATA = [];
const MOCK_MESSAGES = [
    { id: 1, sender: 'other', text: 'Hey! I saw your profile, impressive work.', time: '10:30 AM' },
    { id: 2, sender: 'me', text: 'Thanks! Appreciate you reaching out.', time: '10:31 AM' },
    { id: 3, sender: 'other', text: 'We have a project coming up, "Stranger Things". I think you would be a great fit for a role.', time: '10:31 AM' },
    { id: 4, sender: 'me', text: 'Sounds interesting! Can you send over the script?', time: '10:32 AM' },
];
const MOCK_AWARDS = [
    { id: 1, title: 'Best Actor', event: 'Cairo Film Festival', year: '2023', icon: Award },
    { id: 2, title: 'Top Performer', event: 'Annual Theatre Awards', year: '2022', icon: Star },
    { id: 3, title: 'Rising Star', event: 'New Wave Cinema', year: '2021', icon: Sparkles },
];
const MOCK_GALLERY_IMAGES = Array.from({ length: 9 }).map((_, i) => ({ id: i + 1, type: 'image', url: createPlaceholder(600, 800, '1a202c', 'ffffff', `Image ${i+1}`) }));
const MOCK_GALLERY_VIDEOS = Array.from({ length: 4 }).map((_, i) => ({ id: i + 1, type: 'video', url: createPlaceholder(600, 800, 'e2e8f0', '1a202c', `Video ${i+1}`), videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }));
const MOCK_GALLERY_AUDIO = Array.from({ length: 3 }).map((_, i) => ({ id: i + 1, type: 'audio', title: `Audio Track ${i+1}`, artist: 'Artist Name', url: createPlaceholder(200, 200, '4a5568', 'ffffff', `Audio ${i+1}`), audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }));
const MOCK_ALBUMS = [
    { id: 1, title: 'Album 1', url: createPlaceholder(600, 600, '1a202c', 'ffffff', `Album 1`), imageCount: 5, videoCount: 2, audioCount: 1 },
    { id: 2, title: 'Album 2', url: createPlaceholder(600, 600, '2d3748', 'ffffff', `Album 2`), imageCount: 4, videoCount: 2, audioCount: 2 }
];
const MOCK_COURSES = [
    { id: 1, category: 'ACT', title: "Advanced Acting Techniques", date: "Sep 15, 2025", sessions: 8, location: "Cairo", price: "2500 EGP", image: createPlaceholder(800, 400, '1a202c', 'ffffff', 'ACT') },
    { id: 2, category: 'Dance', title: "Contemporary Dance Fusion", date: "Sep 20, 2025", sessions: 10, location: "Alexandria", price: "1800 EGP", image: createPlaceholder(800, 400, '2d3748', 'ffffff', 'DANCE') },
    { id: 3, category: 'Directing', title: "Director's Vision Workshop", date: "Oct 01, 2025", sessions: 6, location: "Cairo", price: "3000 EGP", image: createPlaceholder(800, 400, '4a5568', 'ffffff', 'DIRECT') },
    { id: 4, category: 'ACT', title: "Method Acting Fundamentals", date: "Oct 05, 2025", sessions: 12, location: "Giza", price: "2800 EGP", image: createPlaceholder(800, 400, '1a202c', 'ffffff', 'ACT') },
];
const MOCK_PRODUCTS = [
    { id: 1, name: "Cinema Camera A", category: "Cameras", type: "Rent", price: "1500 EGP/day", priceValue: 1500, rating: 4.5, imageUrl: createPlaceholder(400, 400, '1a202c', 'ffffff', 'CAM A'), brand: "Sony" },
    { id: 2, name: "LED Light Panel", category: "Lighting", type: "New", price: "4500 EGP", priceValue: 4500, rating: 5, imageUrl: createPlaceholder(400, 400, '2d3748', 'ffffff', 'LED'), brand: "Arri" },
    { id: 3, name: "Boom Mic Kit", category: "Audio", type: "Rent", price: "500 EGP/day", priceValue: 500, rating: 4, imageUrl: createPlaceholder(400, 400, '4a5568', 'ffffff', 'MIC'), brand: "Sennheiser" },
    { id: 4, name: "4K Monitor", category: "Screens", type: "Used", price: "8000 EGP", priceValue: 8000, rating: 3.5, imageUrl: createPlaceholder(400, 400, '1a202c', 'ffffff', '4K'), brand: "Panasonic" },
    { id: 5, name: "Gimbal Stabilizer", category: "Accessories", type: "Rent", price: "750 EGP/day", priceValue: 750, rating: 4.8, imageUrl: createPlaceholder(400, 400, '2d3748', 'ffffff', 'GIMBAL'), brand: "DJI" },
    { id: 6, name: "Cinema Camera B", category: "Cameras", type: "New", price: "120000 EGP", priceValue: 120000, rating: 5, imageUrl: createPlaceholder(400, 400, '4a5568', 'ffffff', 'CAM B'), brand: "Canon" },
];
const MAX_PRODUCT_PRICE = 150000;
const MOCK_TRUSTED_PARTNERS = [
    { id: 1, name: "Radio Shack", imageUrl: createPlaceholder(800, 400, 'ff0000', 'FFFFFF', 'Radio Shack') },
    { id: 2, name: "Sharaf DG", imageUrl: createPlaceholder(800, 400, '00a4e4', 'FFFFFF', 'Sharaf DG') },
    { id: 3, name: "Foto Express", imageUrl: createPlaceholder(800, 400, 'fdb913', '000000', 'Foto Express') },
    { id: 4, name: "Shams Stores", imageUrl: createPlaceholder(800, 400, '000000', 'FFFFFF', 'Shams Stores') },
    { id: 5, name: "iCamStore", imageUrl: createPlaceholder(800, 400, '1c1c1c', 'FFFFFF', 'iCamStore') },
    { id: 6, name: "Kareem Stores", imageUrl: createPlaceholder(800, 400, '004b8d', 'FFFFFF', 'Kareem Stores') },
    { id: 7, name: "General Pro", imageUrl: createPlaceholder(800, 400, 'e41e26', 'FFFFFF', 'General Pro') },
];
const MOCK_EVENTS = [
    { id: 1, type: "Festival", title: "Cairo International Film Festival", date: "November 15, 2025", location: "Cairo Opera House", image: createPlaceholder(800, 400, 'b91c1c', 'ffffff', 'CIFF'), description: "The most prestigious film festival in the Arab world, showcasing a diverse selection of international and regional films." },
    { id: 2, type: "Workshop", title: "Screenwriting Masterclass", date: "October 10, 2025", location: "Online", image: createPlaceholder(800, 400, '1a202c', 'ffffff', 'Workshop'), description: "An intensive workshop for aspiring screenwriters, focusing on narrative structure, character development, and dialogue." },
];

const COUNTRIES = {
    'Egypt': '🇪🇬',
    'Saudi Arabia': '🇸🇦',
    'UAE': '🇦🇪',
    'Kuwait': '🇰🇼',
    'Qatar': '🇶🇦',
    'Morocco': '🇲🇦',
    'Tunisia': '🇹🇳',
    'Iraq': '🇮🇶',
    'Jordan': '🇯🇴',
    'Bahrain': '🇧🇭',
    'Syria': '🇸🇾',
    'Lebanon': '🇱🇧',
    'Oman': '🇴🇲',
};

const MOCK_OPPORTUNITIES = [
    { id: 1, type: "Casting Call", title: "Lead Role in Historical Epic", organization: "Pharaoh Productions", deadline: "October 31, 2025", image: createPlaceholder(800, 400, '8b5e34', 'ffffff', 'Casting'), description: "Seeking a male actor, age 25-35, for the lead role in a major historical feature film. Experience in period dramas preferred." },
    { id: 2, type: "Fund", title: "Short Film Development Fund", organization: "Creative Egypt Fund", deadline: "December 01, 2025", image: createPlaceholder(800, 400, '0077b6', 'ffffff', 'Fund'), description: "A fund dedicated to supporting emerging filmmakers in Egypt. Submissions for short film projects are now open." },
];

const ADMIN_ROLES = ['Admin', 'Project Manager', 'Coordinator', 'Supervisor'];

const MOCK_NOTIFICATIONS = [];

const MOCK_BOOKING_REQUESTS = [
    {
        id: 'b1',
        project: '"Football Match"',
        from: MOCK_PROFILES_DATA[2], // Salma Ibrahim
        role: 'Player',
        dates: 'October 3, 2025',
        hours: '6:00 PM - 8:00 PM',
        location: 'Local Club',
        status: 'pending',
        attendees: [MOCK_PROFILES_DATA[2], MOCK_PROFILES_DATA[1], MOCK_PROFILES_DATA[3]]
    },
    {
        id: 'b2',
        project: '"Pepsi Commercial"',
        from: MOCK_COMPANIES_DATA.find(c => c.name === 'Tarek Nour Communications'),
        role: 'Main Actor',
        dates: 'October 10, 2025 - October 15, 2025',
        hours: '8:00 AM - 6:00 PM',
        location: 'Desert Road Studio',
        status: 'pending'
    },
    {
        id: 'b3',
        project: '"New Series \'The Palace\'"',
        from: MOCK_COMPANIES_DATA.find(c => c.name === 'The Producers'),
        role: 'Voice Over Artist',
        dates: 'October 6, 2025',
        hours: '12:00 PM - 4:00 PM',
        location: 'The Garage Studio',
        status: 'pending'
    }
];

const MOCK_POSTS = [];
const safeString = (v, fb = "—") => (typeof v === "string" ? v : v == null ? fb : String(v));
const formatUsers = (v) => (typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : typeof v === "string" && v.trim() ? v.trim() : "0");

function CountryPicker({ onClose, onSelect, selectedValue }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-14 right-3 w-48 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-50 origin-top-right"
        >
            <div className="p-2">
                <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 px-2 pb-1">Select Country</p>
                {Object.entries(COUNTRIES).map(([name, flag]) => (
                    <button
                        key={name}
                        onClick={() => onSelect(name)}
                        className={`w-full flex items-center justify-between text-left p-2 rounded-md text-sm font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white ${selectedValue === name ? 'bg-zinc-100 dark:bg-zinc-700' : ''}`}
                    >
                        <span>{name}</span>
                        <span>{flag}</span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
}

function ScrollPicker({ values, selectedValue, onSelect, itemHeight = 32, className = "" }) {
    const containerRef = useRef(null);
    const scrollTimeoutRef = useRef(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (container && !isInteracting) {
            const index = values.findIndex(v => v === selectedValue);
            if (index !== -1) {
                const targetScrollTop = index * itemHeight;
                container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
            }
        }
    }, [selectedValue, values, itemHeight, isInteracting]);
    
    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;

        setScrollTop(container.scrollTop);

        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            const index = Math.round(container.scrollTop / itemHeight);
            const newValue = values[index];
            if (newValue && newValue !== selectedValue) {
                onSelect(newValue);
            } else {
                container.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
            }
            setIsInteracting(false);
        }, 200);
    };

    const handleInteraction = () => {
        setIsInteracting(true);
        clearTimeout(scrollTimeoutRef.current);
    }

    return (
        <div 
            className="relative h-full"
            onMouseDown={handleInteraction}
            onTouchStart={handleInteraction}
            onWheel={handleInteraction}
        >
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full overflow-y-scroll no-scrollbar"
            >
                <div style={{ height: `calc(50% - ${itemHeight / 2}px)` }} />
                {values.map((value, index) => {
                    const itemTop = index * itemHeight;
                    const containerHeight = containerRef.current?.offsetHeight || 0;
                    const containerCenter = scrollTop + containerHeight / 2;
                    const itemCenter = itemTop + itemHeight / 2;
                    const distance = Math.abs(containerCenter - itemCenter);
                    
                    const scale = Math.max(0.7, 1 - (distance / (containerHeight)));
                    const opacity = Math.max(0.2, 1 - (distance / (containerHeight / 2)));
                    const isCenter = distance < itemHeight / 2;
                    
                    return (
                        <div
                            key={value}
                            className={`flex items-center justify-center font-bold transition-colors duration-150 text-black ${className}`}
                            style={{
                                height: `${itemHeight}px`,
                                transform: `scale(${scale})`,
                            }}
                        >
                           {value}
                        </div>
                    );
                })}
                <div style={{ height: `calc(50% - ${itemHeight / 2}px)` }} />
            </div>
             {/* <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/70 via-transparent to-zinc-900/70" /> */}
        </div>
    );
}


const DeviceFrame = ({ children, theme }) => (
    <div className={`mx-auto my-4 md:my-8 w-[390px] h-[844px] rounded-[28px] shadow-2xl border border-zinc-200 bg-white dark:bg-black overflow-hidden relative ${theme}`}>
        <div className="absolute inset-0 pt-11 h-full w-full">{children}</div>
        <div className="absolute top-0 left-0 right-0 h-11 bg-black" />
        <div className="absolute inset-x-24 top-0 h-6 bg-zinc-500 rounded-b-3xl" />
    </div>
);

const Press = ({ children, className = "", onClick }) => (
    <button onClick={onClick} className={`select-none active:outline-none focus:outline-none ${className}`}>{children}</button>
);

function CourseCard({ course, onSelect }) {
    return (
        <button onClick={() => onSelect(course)} className="w-full text-left bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden mb-3 relative aspect-[16/10] transition-all hover:shadow-lg hover:-translate-y-1">
            <img src={course.image} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex flex-col justify-end p-3">
                <h3 className="font-bold text-lg text-white">{course.title}</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-white/90">
                    <div className="flex items-center gap-1.5"><Calendar size={14} /> <span>{course.date}</span></div>
                    <div className="flex items-center gap-1.5"><Hash size={14} /> <span>{course.sessions} Sessions</span></div>
                    <div className="flex items-center gap-1.5"><MapPin size={14} /> <span>{course.location}</span></div>
                </div>
                <div className="flex justify-between items-center mt-3">
                    <span className="font-bold text-white">{course.price}</span>
                    <div className="bg-white text-black text-xs font-bold py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5">
                        <Ticket size={14} />
                        Details
                    </div>
                </div>
            </div>
        </button>
    );
}

function SearchBar({ value, onChange, onOpenFilter }) {
    return (
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 h-11 border-2 border-transparent focus-within:border-black dark:focus-within:border-white transition-colors">
            <Search className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <input
                value={value}
                onChange={e => onChange(e.target.value)}
                className="flex-1 w-full h-full bg-transparent outline-none text-[14px] dark:text-white"
                placeholder="Search..."
            />
            {onOpenFilter && (
                <button onClick={onOpenFilter} className="p-1.5 -mr-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                    <SlidersHorizontal className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}

function PageHeader({ title, onBack, searchQuery, onSearchChange, onOpenFilter, rightAction, leftAction }) {
    return (
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
            {onSearchChange ? (
                 <SearchBar value={searchQuery} onChange={onSearchChange} onOpenFilter={onOpenFilter} />
            ) : (
                <div className="flex items-center justify-center relative h-8">
                    {leftAction && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2">{leftAction}</div>
                    )}
                    <h1 className="font-bold text-lg dark:text-white">{title}</h1>
                    {rightAction && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2">{rightAction}</div>
                    )}
                </div>
            )}
        </header>
    );
}

function HomeHeader({ theme, onToggleTheme, onNavigate, searchQuery, onSearchChange, onOpenFilter, onOpenMainMenu }) {
    return (
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
            <SearchBar value={searchQuery} onChange={onSearchChange} onOpenFilter={onOpenFilter} />
        </header>
    );
}

function SectionCard({ section, onClick }) {
    const Icon = SECTION_ICONS[section.key] || Sparkles;
    return (
        <Press
            onClick={onClick}
            className="w-full border-2 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700 rounded-xl p-3 flex items-center justify-between active:scale-95 transition-transform duration-200"
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg grid place-items-center border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <Icon className="w-5 h-5" />
                </div>
                <div className="font-bold tracking-tight text-lg">{section.title}</div>
            </div>
        </Press>
    );
}

function HomeNavButton({ icon: Icon, title, subtitle, onClick }) {
    return (
        <button onClick={onClick} className="flex-1 flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <div className="w-10 h-10 rounded-md grid place-items-center bg-black dark:bg-zinc-800 text-white">
                <Icon className="w-5 h-5" />
            </div>
            <div className="text-left">
                <p className="font-bold dark:text-white">{title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</p>
            </div>
        </button>
    );
}

function HomePage({ onServiceSelect, onOpenFilter, searchQuery, onSearchChange, onToggleTheme, theme, onNavigate, user, onOpenMainMenu }) {
    const contentRef = useRef(null);

    const filteredSections = useMemo(() => {
        if (!searchQuery) return SECTIONS;
        const lowerCaseQuery = searchQuery.toLowerCase();

        return SECTIONS.filter(section => {
            const hasMatchingItem = section.items.some(item =>
                item.label.toLowerCase().includes(lowerCaseQuery)
            );
            return section.title.toLowerCase().includes(lowerCaseQuery) || hasMatchingItem;
        });
    }, [searchQuery]);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <HomeHeader
                theme={theme}
                onToggleTheme={onToggleTheme}
                onNavigate={onNavigate}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onOpenFilter={onOpenFilter}
                onOpenMainMenu={onOpenMainMenu}
            />
            <main ref={contentRef} className="flex-1 overflow-y-auto relative">
                <AdSlider />
                <div className="p-3 grid grid-cols-1 gap-2">
                    {filteredSections.map((sec) => (
                        <SectionCard
                            key={sec.key}
                            section={sec}
                            onClick={() => onNavigate('sectionServices', sec)}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}

function ServiceCard({ item, onSelect }) {
    const Icon = ITEM_ICONS[item.label] || Film;
    const userCount = useMemo(() => formatUsers(item.users), [item.users]);
    return (
        <Press
            onClick={onSelect}
            className="w-full rounded-xl border-2 p-3 flex items-center justify-between bg-white dark:bg-zinc-900 border-black dark:border-zinc-700 text-black dark:text-white text-left group hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all duration-200"
        >
            <div className="flex items-center gap-5">
                 <div className="w-20 h-20 rounded-lg grid place-items-center border-2 border-black dark:border-zinc-700">
                    <Icon className="w-10 h-10" />
                </div>
                <div className="font-bold text-xl leading-snug">{item.label}</div>
            </div>
            {item.users != null && (
                 <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5"><UsersIcon className="w-5 h-5" /><span>{userCount}</span></div>
                </div>
            )}
        </Press>
    );
}

function CompanyCard({ company, onSelect, onAddToTeam, myTeam, onAssignToProject }) {
    const [visibleTooltip, setVisibleTooltip] = useState(null);
    const isAdded = myTeam && myTeam.some(m => m.id === company.id);

    const showTooltip = (tooltipName) => {
        setVisibleTooltip(tooltipName);
        setTimeout(() => setVisibleTooltip(null), 3000);
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        showTooltip('team');
        onAddToTeam(company);
    };

    const handleAssignClick = (e) => {
        e.stopPropagation();
        showTooltip('project');
        // onAssignToProject(company);
    };
    
    return (
        <div onClick={() => onSelect(company)} className="relative group w-full overflow-hidden text-left bg-zinc-100 dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
            <div className="aspect-video relative bg-zinc-100 dark:bg-zinc-800">
                <img src={company.imageUrl} alt={company.name} className="absolute inset-0 w-full h-full object-cover" />
            </div>
             <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                <div className="relative flex items-center">
                    <AnimatePresence>
                        {visibleTooltip === 'team' && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="mr-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md whitespace-nowrap"
                            >
                                My Team
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={handleAddClick} title="Add to My Team" className={`p-1.5 rounded-full backdrop-blur-sm transition-colors duration-200 z-10 opacity-0 group-hover:opacity-100 ${isAdded ? 'bg-white text-black' : 'bg-black/30 text-white hover:bg-black/60'}`}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isAdded ? "check" : "plus"}
                                initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                transition={{ duration: 0.2 }}
                            >
                                {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </motion.div>
                        </AnimatePresence>
                    </button>
                </div>
                 <div className="relative flex items-center">
                    <AnimatePresence>
                        {visibleTooltip === 'project' && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="mr-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md whitespace-nowrap"
                            >
                                Add to Project
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <button onClick={handleAssignClick} title="Add to Crew" className="p-1.5 rounded-full bg-black/30 text-white hover:bg-black/60 backdrop-blur-sm transition-colors duration-200 z-10 opacity-0 group-hover:opacity-100">
                        <Briefcase className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <h3 className="font-bold text-black dark:text-white">{company.name}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{company.specialty}</p>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    <MapPin size={12} />
                    <span>{company.location}</span>
                </div>
            </div>
        </div>
    );
}

function SectionServicesPage({ section, onBack, onServiceSelect }) {
    if (!section) return null;

    const Icon = SECTION_ICONS[section.key] || Sparkles;

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <main className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-3">
                    {section.items.map((item) => (
                        <ServiceCard key={item.label} item={item} onSelect={() => onServiceSelect(item, section.key)} />
                    ))}
                </div>
            </main>
        </div>
    );
}

function ServiceDetailPage({ service, onBack, onProfileSelect, onCompanySelect, onAddToTeam, onAssignToProject, myTeam }) {
    const isCompanyView = COMPANY_SERVICES.includes(service.label);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [serviceFilters, setServiceFilters] = useState({});

    const filteredProfiles = useMemo(() => {
        return MOCK_PROFILES.filter(profile => {
            const matchesSearch = searchQuery === '' ||
                profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                profile.specialty.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            const allLocations = [...(serviceFilters.currentLocations || []), ...(serviceFilters.shootingLocations || [])];
            if (allLocations.length > 0 && !allLocations.includes(profile.about.location)) {
                return false;
            }

            return Object.entries(serviceFilters).every(([key, value]) => {
                if (key === 'currentLocations' || key === 'shootingLocations') return true;
                if (!value || (Array.isArray(value) && value.length === 0)) return true;

                switch (key) {
                    case 'gender':
                        return profile.about.gender === value;
                    case 'nationality':
                        return value.includes(profile.about.nationality);
                    case 'skills':
                    case 'awards':
                        return value.every(v => profile.skills.includes(v));
                    case 'dialects':
                        if (!profile.about.dialects || profile.about.dialects.length === 0) return false;
                        return value.every(v => profile.about.dialects.includes(v));
                    case 'age': {
                        if (typeof value !== 'string') return true;
                        const [min, max] = value.split('-').map(Number);
                        return profile.about.age >= min && profile.about.age <= max;
                    }
                    case 'height': {
                        if (typeof value !== 'string' || !profile.about.height) return true;
                        const [min, max] = value.replace('cm', '').split('-').map(Number);
                        return profile.about.height >= min && profile.about.height <= max;
                    }
                    case 'weight': {
                         if (typeof value !== 'string' || !profile.about.weight) return true;
                        const [min, max] = value.replace('kg', '').split('-').map(Number);
                        return profile.about.weight >= min && profile.about.weight <= max;
                    }
                    case 'skinTone': {
                        if (!value || value.length === 0) return true;
                        return value.includes(profile.about.skinTone);
                    }
                    case 'hairColor': {
                        if (!value || value.length === 0) return true;
                        return value.includes(profile.about.hairColor);
                    }
                    case 'willingToTravel': {
                        if (value === null || value === undefined) return true;
                        return profile.about.willingToTravel === value;
                    }
                    default:
                        return true;
                }
            });
        });
    }, [searchQuery, serviceFilters]);

    const filteredCompanies = useMemo(() => {
        return MOCK_COMPANIES.filter(company => {
            // First, filter by the service category itself.
            if (company.category !== service.label) return false;

            const matchesSearch = searchQuery === '' ||
                company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                company.specialty.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return false;

            const allLocations = [...(serviceFilters.currentLocations || []), ...(serviceFilters.shootingLocations || [])];
            if (allLocations.length > 0 && !allLocations.includes(company.location.split(',')[0])) {
                return false;
            }

            return Object.entries(serviceFilters).every(([key, value]) => {
                if (key === 'currentLocations' || key === 'shootingLocations') return true;

                if (!value || (Array.isArray(value) && value.length === 0)) return true;
                
                switch (key) {
                    case 'specialty':
                        return value.includes(company.specialty);
                    default:
                        return true;
                }
            });
        });
    }, [searchQuery, serviceFilters, service.label]);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <header className="sticky top-0 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                <SearchBar value={searchQuery} onChange={setSearchQuery} onOpenFilter={() => setIsFilterModalOpen(true)} />
            </header>

            <main className="flex-1 overflow-y-auto p-3">
                {isCompanyView ? (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {filteredCompanies.map(company => (
                            <div key={company.id} className="py-8 first:pt-0">
                                <CompanyCard 
                                    company={company} 
                                    onSelect={onCompanySelect} 
                                    onAddToTeam={onAddToTeam}
                                    myTeam={myTeam}
                                    onAssignToProject={onAssignToProject}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <ProfileGrid profiles={filteredProfiles} onProfileSelect={onProfileSelect} onAddToTeam={onAddToTeam} onAssignToProject={onAssignToProject} myTeam={myTeam} />
                )}
            </main>

            <ServiceFilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                onApply={setServiceFilters}
                currentFilters={serviceFilters}
                serviceType={service.label}
            />
        </div>
    );
}

function CollapsibleFilterSection({ title, icon: Icon, children, initiallyOpen = false }) {
    const [isOpen, setIsOpen] = useState(initiallyOpen);

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-3 text-left"
            >
                <h3 className="font-bold dark:text-white flex items-center gap-2 capitalize">
                    {Icon && <Icon className="w-4 h-4" />}
                    {title}
                </h3>
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.section
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 border-t-2 border-zinc-100 dark:border-zinc-800">
                            {children}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
    );
}

function ServiceFilterModal({ isOpen, onClose, onApply, currentFilters, serviceType }) {
    const [localFilters, setLocalFilters] = useState(currentFilters);
    const [currentLocationInput, setCurrentLocationInput] = useState('');
    const [shootingLocationInput, setShootingLocationInput] = useState('');
    const [nationalityInput, setNationalityInput] = useState('');
    const availableFilterKeys = useMemo(() => SERVICE_FILTERS[serviceType] || [], [serviceType]);

    // Group physical attributes as requested
    const physicalKeys = ['age', 'height', 'weight'];
    const availablePhysicalKeys = useMemo(() => physicalKeys.filter(k => availableFilterKeys.includes(k)), [availableFilterKeys]);
    
    // Separate gender to prioritize it
    const hasGenderFilter = useMemo(() => availableFilterKeys.includes('gender'), [availableFilterKeys]);

    useEffect(() => {
        setLocalFilters(currentFilters);
    }, [isOpen, currentFilters]);

    const handleAddLocation = (locationToAdd, locationType, setInputState) => {
        if (locationToAdd.trim() !== '') {
            const key = locationType === 'current' ? 'currentLocations' : 'shootingLocations';
            setLocalFilters(prev => {
                const currentValues = prev[key] || [];
                if (!currentValues.some(l => l.toLowerCase() === locationToAdd.trim().toLowerCase())) {
                    return { ...prev, [key]: [...currentValues, locationToAdd.trim()] };
                }
                return prev;
            });
            setInputState('');
        }
    };

    const handleRemoveLocation = (locToRemove, locationType) => {
        const key = locationType === 'current' ? 'currentLocations' : 'shootingLocations';
        setLocalFilters(prev => ({
            ...prev,
            [key]: (prev[key] || []).filter(loc => loc !== locToRemove)
        }));
    };

    const handleAddNationality = () => {
        if (nationalityInput.trim() !== '') {
            setLocalFilters(prev => {
                const currentNationalities = prev.nationality || [];
                if (!currentNationalities.some(n => n.toLowerCase() === nationalityInput.trim().toLowerCase())) {
                    return { ...prev, nationality: [...currentNationalities, nationalityInput.trim()] };
                }
                return prev;
            });
            setNationalityInput('');
        }
    };

    const handleRemoveNationality = (natToRemove) => {
        setLocalFilters(prev => ({
            ...prev,
            nationality: (prev.nationality || []).filter(nat => nat !== natToRemove)
        }));
    };

    const handleSingleSelectChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: prev[key] === value ? null : value }));
    };

    const toggleMultiSelect = (key, value) => {
        setLocalFilters(prev => {
            const currentValues = prev[key] || [];
            const newValues = currentValues.includes(value)
                ? currentValues.filter(v => v !== value)
                : [...currentValues, value];
            return { ...prev, [key]: newValues };
        });
    };
    
    const handleWillingToTravelToggle = () => {
        setLocalFilters(prev => ({ ...prev, willingToTravel: !prev.willingToTravel }));
    };

    const handleRangeChange = (key, value) => {
        setLocalFilters(prev => ({...prev, [key]: value}));
    };

    const handleClearMultiSelect = (key) => {
         setLocalFilters(prev => ({ ...prev, [key]: [] }));
    }

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        setLocalFilters({});
    };

    const RangeFilter = ({ filterKey }) => {
        const options = FILTER_OPTIONS[filterKey];
        const unit = filterKey === 'height' ? 'cm' : filterKey === 'weight' ? 'kg' : '';
        
        const [minVal, maxVal] = useMemo(() => {
            const value = localFilters[filterKey];
            if (!value) {
                let initialMin, initialMax;
                switch(filterKey) {
                    case 'age': initialMin = 18; initialMax = 40; break;
                    case 'height': initialMin = 150; initialMax = 190; break;
                    case 'weight': initialMin = 50; initialMax = 90; break;
                    default: initialMin = options.min; initialMax = options.max;
                }
                return [initialMin, initialMax];
            }
            const parts = value.replace(unit, '').split('-');
            return [parseInt(parts[0], 10) || options.min, parseInt(parts[1], 10) || options.max];
        }, [localFilters, filterKey, unit, options]);

        const [minValue, setMinValue] = useState(minVal);
        const [maxValue, setMaxValue] = useState(maxVal);
        
        const timeoutRef = useRef(null);
        useEffect(() => {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(() => {
                 handleRangeChange(filterKey, `${minValue}-${maxValue}${unit}`);
            }, 50);
            return () => clearTimeout(timeoutRef.current);
        }, [minValue, maxValue, filterKey, unit]);
        
        const minPos = ((minValue - options.min) / (options.max - options.min)) * 100;
        const maxPos = ((maxValue - options.min) / (options.max - options.min)) * 100;

        return (
            <div className="w-full">
                <div className="relative h-2 my-4">
                    <div className="absolute bg-zinc-200 dark:bg-zinc-700 h-0.5 w-full top-1/2 -translate-y-1/2 rounded-full"></div>
                    <div className="absolute bg-black dark:bg-white h-0.5 top-1/2 -translate-y-1/2 rounded-full" style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}></div>
                    <input type="range" min={options.min} max={options.max} value={minValue} onChange={(e) => setMinValue(Math.min(Number(e.target.value), maxValue - 1))} className="range-slider" />
                    <input type="range" min={options.min} max={options.max} value={maxValue} onChange={(e) => setMaxValue(Math.max(Number(e.target.value), minValue + 1))} className="range-slider" />
                </div>
                <div className="text-sm dark:text-white text-center font-bold">{minValue}{unit} - {maxValue}{unit}</div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={handleApply} />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative h-full w-full max-w-[390px] mx-auto bg-zinc-100 dark:bg-black flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Filters</h2>
                                <button onClick={handleApply} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-3 space-y-3 overflow-y-auto">
                            {hasGenderFilter && (
                                <CollapsibleFilterSection title="Gender" icon={FILTER_ICONS.gender}>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FILTER_OPTIONS.gender.map(option => {
                                            const isSelected = localFilters['gender'] === option;
                                            return (
                                                <button key={option} onClick={() => handleSingleSelectChange('gender', option)} className={`p-2 rounded-md flex items-center justify-center gap-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                                    <span>{option}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </CollapsibleFilterSection>
                            )}

                            {availablePhysicalKeys.length > 0 && (
                                <CollapsibleFilterSection title="Physical Attributes" icon={FILTER_ICONS.age}>
                                    <div className="space-y-4">
                                        {availablePhysicalKeys.map((key, index) => {
                                            const Icon = FILTER_ICONS[key];
                                            return (
                                                <div key={key} className={index < availablePhysicalKeys.length - 1 ? 'border-b-2 border-zinc-100 dark:border-zinc-800 pb-4' : ''}>
                                                    <h3 className="font-bold dark:text-white mb-3 capitalize flex items-center gap-2"><Icon className="w-4 h-4" /> {key}</h3>
                                                    <RangeFilter filterKey={key} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CollapsibleFilterSection>
                            )}

                            {availableFilterKeys.includes('dialects') && (
                                <CollapsibleFilterSection title="Accent" icon={FILTER_ICONS.dialects}>
                                    {Object.entries(DIALECTS).map(([groupName, dialects]) => (
                                        <div key={groupName} className="mb-3 last:mb-0">
                                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1">{groupName}</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {dialects.map(dialect => {
                                                    const isSelected = (localFilters['dialects'] || []).includes(dialect);
                                                    return (
                                                        <button key={dialect} onClick={() => toggleMultiSelect('dialects', dialect)} className={`px-3 py-1 rounded-full text-xs transition-colors ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black font-bold' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                                            {dialect}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => handleClearMultiSelect('dialects')} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">Clear all</button>
                                </CollapsibleFilterSection>
                            )}

                            {availableFilterKeys.includes('nationality') && (
                                <CollapsibleFilterSection title="Nationality" icon={FILTER_ICONS.nationality}>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Add one or more nationalities.</p>
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={nationalityInput}
                                            onChange={(e) => setNationalityInput(e.target.value)}
                                            onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNationality(); } }}
                                            placeholder="e.g., Egyptian, American..."
                                            className="flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        />
                                        <button onClick={handleAddNationality} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-md">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[24px]">
                                        {(localFilters.nationality || []).map(nat => (
                                            <div key={nat} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black text-xs pl-2 pr-1 py-1 rounded">
                                                <span className="font-semibold">{nat}</span>
                                                <button onClick={() => handleRemoveNationality(nat)} className="p-0.5 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 rounded-full">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => handleClearMultiSelect('nationality')} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                                </CollapsibleFilterSection>
                            )}

                            {availableFilterKeys.includes('skinTone') && (
                                <CollapsibleFilterSection title="Skin Tone" icon={FILTER_ICONS.skinTone}>
                                    <div className="flex justify-center items-center gap-4 pt-2">
                                        {SKIN_TONE_COLORS.map(option => {
                                            const isSelected = (localFilters['skinTone'] || []).includes(option.name);
                                            return (
                                                <motion.div
                                                    key={option.name}
                                                    animate={{ scale: isSelected ? 1.2 : 1 }}
                                                    whileHover={{ scale: 1.1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                >
                                                    <button
                                                        title={option.name}
                                                        onClick={() => toggleMultiSelect('skinTone', option.name)}
                                                        className={`w-10 h-10 rounded-full transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-2 ring-black dark:ring-white ring-offset-white dark:ring-offset-zinc-900' : ''}`}
                                                        style={{ backgroundColor: option.hex }}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => handleClearMultiSelect('skinTone')} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                                </CollapsibleFilterSection>
                            )}
                            
                            {availableFilterKeys.includes('hairColor') && (
                                <CollapsibleFilterSection title="Hair Color" icon={FILTER_ICONS.hairColor}>
                                    <div className="flex justify-center items-center gap-4 pt-2">
                                        {HAIR_COLORS.map(option => {
                                            const isSelected = (localFilters['hairColor'] || []).includes(option.name);
                                            return (
                                                <motion.div
                                                    key={option.name}
                                                    animate={{ scale: isSelected ? 1.2 : 1 }}
                                                    whileHover={{ scale: 1.1 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                                >
                                                    <button
                                                        title={option.name}
                                                        onClick={() => toggleMultiSelect('hairColor', option.name)}
                                                        className={`w-10 h-10 rounded-full transition-all duration-200 ${isSelected ? 'ring-2 ring-offset-2 ring-black dark:ring-white ring-offset-white dark:ring-offset-zinc-900' : ''} ${option.hex === '#000000' ? 'border border-zinc-400' : ''}`}
                                                        style={{ backgroundColor: option.hex }}
                                                    />
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                    <button onClick={() => handleClearMultiSelect('hairColor')} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                                </CollapsibleFilterSection>
                            )}
                            
                            {availableFilterKeys.includes('location') && (
                                <CollapsibleFilterSection title="Location" icon={FILTER_ICONS.location}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 block">Current location</label>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={currentLocationInput}
                                                    onChange={(e) => setCurrentLocationInput(e.target.value)}
                                                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLocation(currentLocationInput, 'current', setCurrentLocationInput); } }}
                                                    placeholder="e.g., Cairo, Dubai..."
                                                    className="flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                                />
                                                <button onClick={() => handleAddLocation(currentLocationInput, 'current', setCurrentLocationInput)} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-md">
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-h-[24px]">
                                                {(localFilters.currentLocations || []).map(loc => (
                                                    <div key={loc} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black text-xs pl-2 pr-1 py-1 rounded">
                                                        <span className="font-semibold">{loc}</span>
                                                        <button onClick={() => handleRemoveLocation(loc, 'current')} className="p-0.5 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 rounded-full">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-2 block">Shooting location</label>
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={shootingLocationInput}
                                                    onChange={(e) => setShootingLocationInput(e.target.value)}
                                                    onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLocation(shootingLocationInput, 'shooting', setShootingLocationInput); } }}
                                                    placeholder="e.g., Aswan, Siwa..."
                                                    className="flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                                />
                                                <button onClick={() => handleAddLocation(shootingLocationInput, 'shooting', setShootingLocationInput)} className="p-2 bg-black dark:bg-white text-white dark:text-black rounded-md">
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-h-[24px]">
                                                {(localFilters.shootingLocations || []).map(loc => (
                                                    <div key={loc} className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black text-xs pl-2 pr-1 py-1 rounded">
                                                        <span className="font-semibold">{loc}</span>
                                                        <button onClick={() => handleRemoveLocation(loc, 'shooting')} className="p-0.5 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 rounded-full">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    {availableFilterKeys.includes('willingToTravel') && (
                                        <div className="border-t-2 border-zinc-100 dark:border-zinc-800 mt-4 pt-3">
                                             <div className="flex justify-between items-center">
                                                <h4 className="font-bold text-sm dark:text-white flex items-center gap-2"><Send className="w-4 h-4" /> Willing to Travel</h4>
                                                <button onClick={handleWillingToTravelToggle} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localFilters.willingToTravel ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${localFilters.willingToTravel ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </CollapsibleFilterSection>
                            )}

                            {['skills', 'awards', 'specialty'].map(key => {
                                if (!availableFilterKeys.includes(key)) return null;

                                const options = FILTER_OPTIONS[key];
                                const Icon = FILTER_ICONS[key];
                                
                                return (
                                    <CollapsibleFilterSection key={key} title={key} icon={Icon}>
                                        {Array.isArray(options) ? (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {options.map(option => {
                                                        const currentSelection = localFilters[key] || [];
                                                        const isSelected = currentSelection.includes(option);
                                                        return (
                                                            <button key={option} onClick={() => toggleMultiSelect(key, option)} className={`p-2 rounded-md flex items-center justify-center gap-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
                                                                <span>{option}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                <button onClick={() => handleClearMultiSelect(key)} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                                            </>
                                        ) : null}
                                    </CollapsibleFilterSection>
                                );
                            })}
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex gap-3">
                                <button onClick={handleReset} className="flex-1 text-black dark:text-white text-sm py-2.5 rounded-md border-2 border-black dark:border-white hover:bg-zinc-100 dark:hover:bg-zinc-800">Reset</button>
                                <button onClick={handleApply} className="flex-1 bg-black dark:bg-white text-white dark:text-black text-sm py-2.5 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200">Apply Filters</button>
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function AcademyDetailPage({ service, onBack, onCourseSelect }) {
    const Icon = ITEM_ICONS[service.label] || GraduationCap;
    const courses = MOCK_COURSES.filter(c => c.category === service.label);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <main className="flex-1 overflow-y-auto p-3">
                {courses.length > 0 ? (
                    courses.map(course => <CourseCard key={course.id} course={course} onSelect={onCourseSelect} />)
                ) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10">
                        <GraduationCap className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold">No Courses Available</h2>
                        <p className="text-sm mt-1">Check back later for new {service.label} courses.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function LegalServiceDetailPage({ service, onBack }) {
    const details = MOCK_LEGAL_SERVICES[service.label];
    const Icon = ITEM_ICONS[service.label] || Gavel;
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    if (!details) {
        return (
            <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
                <header className="sticky top-0 z-10 bg-white dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                    <div className="flex items-center gap-3">
                        <h2 className="font-bold text-xl dark:text-white">Service Not Found</h2>
                    </div>
                </header>
            </div>
        )
    }

    const ContactCard = ({ icon: Icon, title, value, href }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <Icon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            <div className="flex-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
                <p className="font-semibold text-sm dark:text-white">{value}</p>
            </div>
        </a>
    );

    const CostsCard = ({ costs }) => (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3 dark:text-white flex items-center gap-2"><Wallet className="w-5 h-5" /> Estimated Costs</h3>
            <div className="space-y-2">
                {costs.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                        <p className="text-zinc-600 dark:text-zinc-300">{item.item}</p>
                        <p className="font-semibold dark:text-white">{item.price}</p>
                    </div>
                ))}
            </div>
            <div className="border-t border-zinc-200 dark:border-zinc-700 my-3"></div>
            <div className="flex justify-between items-center font-bold">
                <p className="dark:text-white">Total</p>
                <p className="dark:text-white">{costs.total}</p>
            </div>
        </div>
    );

    const ServiceRequestCard = () => (
        <div className="bg-black dark:bg-white border-2 border-black dark:border-zinc-700 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-2 text-white dark:text-black">Apply for this Service</h3>
            <p className="text-sm text-zinc-300 dark:text-zinc-600 mb-4">Let our team handle the procedures for you. Submit a request now.</p>
            <button onClick={() => setIsRequestModalOpen(true)} className="w-full bg-white text-black text-sm font-bold py-3 rounded-lg hover:bg-zinc-200 dark:bg-black dark:text-white dark:hover:bg-zinc-800">
                Submit a Service Request
            </button>
        </div>
    );

    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-2 dark:text-white">Description</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300">{details.description}</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 dark:text-white">Procedures</h3>
                    <ul className="space-y-3">
                        {details.procedures.map((proc, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-black dark:bg-zinc-700 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{index + 1}</div>
                                <span className="text-sm text-zinc-800 dark:text-zinc-200">{proc}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-4">
                    <h3 className="font-bold text-lg mb-3 dark:text-white flex items-center gap-2"><Building className="w-5 h-5"/>Contact Information</h3>
                    <div className="space-y-2">
                        <ContactCard icon={Phone} title="Phone" value={details.contact.phone} href={`tel:${details.contact.phone}`} />
                        <ContactCard icon={MapPin} title="Address" value={details.contact.address} href={`http://maps.google.com/?q=${details.contact.address}`} />
                        <ContactCard icon={Globe} title="Website" value={details.contact.website} href={`https://${details.contact.website}`} />
                    </div>
                </div>
                <CostsCard costs={details.costs} />
                <ServiceRequestCard />
            </main>
            <ServiceRequestModal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} serviceName={service.label} />
    </div>
    );
}

function ServiceRequestModal({ isOpen, onClose, serviceName }) {
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', details: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Service Request Submitted:", { serviceName, ...formData });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Request: {serviceName}</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <form onSubmit={handleSubmit} className="p-4 space-y-3">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your Name" required className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Your Email" required className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
GCL-INTERNAL-SOURCE-URL: https://gemini.google.com/share/4d877cda9b20
                            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Your Phone Number" required className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            <textarea name="details" value={formData.details} onChange={handleChange} placeholder="Additional details about your request..." rows="4" className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white resize-none"></textarea>
                            <button type="submit" className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                                Send Request
                            </button>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function CTPage({ onBack, onNavigate, castMembers, setCastMembers, project, deletedHeroes, setDeletedHeroes }) {
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [editingMemberId, setEditingMemberId] = useState(null);
    const constraintsRef = useRef(null);

    const handleRestoreHero = (heroId) => {
        const heroToRestore = deletedHeroes.find(hero => hero.id === heroId);
        if (heroToRestore) {
            setCastMembers(prev => [...prev, heroToRestore]);
            setDeletedHeroes(prev => prev.filter(hero => hero.id !== heroId));
        }
    };

    const handlePermanentDelete = (heroId) => {
        setDeletedHeroes(prev => prev.filter(hero => hero.id !== heroId));
    };

    const updateMemberPosition = (id, info) => {
        setCastMembers(prev =>
            prev.map(member => {
                if (member.id === id) {
                    const currentX = member.x || 0;
                    const currentY = member.y || 0;
                    return { ...member, x: currentX + info.offset.x, y: currentY + info.offset.y };
                }
                return member;
            })
        );
    };

    const addCastMember = () => {
        setCastMembers(prev => {
            // Find the highest existing id to avoid duplicates if items are removed
            const maxId = prev.reduce((max, member) => Math.max(member.id, max), 0);
            const newId = maxId + 1;
            
            const itemsPerRow = 2;
            const cardWidth = 112; // from w-28
            const containerPadding = 16; // from p-4
            const containerWidth = 390 - (containerPadding * 2);

            // Calculate horizontal spacing to distribute items evenly
            const totalItemWidth = itemsPerRow * cardWidth;
            const totalSpacing = containerWidth - totalItemWidth;
            const spacingX = totalSpacing / (itemsPerRow + 1);

            const cardHeightWithText = 142; // h-28 (112px) + gap-2 (8px) + text height
            const spacingY = 30; // Vertical space between rows
            const initialY = 20; // Top margin for the first row

            const newIndex = prev.length;
            const rowIndex = Math.floor(newIndex / itemsPerRow);
            const colIndex = newIndex % itemsPerRow;
            
            const newX = spacingX + colIndex * (cardWidth + spacingX);
            const newY = initialY + rowIndex * (cardHeightWithText + spacingY);

            const firstCandidateId = Date.now();

            return [...prev, { 
                id: newId, name: `Hero ${newId}`, x: newX, y: newY, 
                primaryCandidateId: firstCandidateId,
                candidates: [{ id: firstCandidateId, selectionType: null, selectionData: null, customName: '' }],
                roleDetails: { name: `Hero ${newId}`, age: '', details: '' }, // Initialize role details
                clothingSections: [{ id: Date.now(), name: 'Clothing', items: [], notes: '' }],
                propsSections: [{ id: Date.now() + 1, name: 'Props', items: [], notes: '' }],
                locationSections: [{ id: Date.now() + 2, name: 'Locations', items: [], notes: '' }]
            }];
        });
    };
    
    const removeCastMember = (idToRemove) => {
        const memberToRemove = castMembers.find(member => member.id === idToRemove);
        if (memberToRemove) {
            setDeletedHeroes(prev => [...prev, memberToRemove]);
        }
        setCastMembers(prev => prev.filter(member => member.id !== idToRemove));
    };
    
    const handleNameChange = (id, newName) => {
        setCastMembers(prev => 
            prev.map(member => 
                member.id === id ? { ...member, name: newName } : member
            )
        );
    };

    const handleFinishEditing = () => {
        setEditingMemberId(null);
    };
    
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleFinishEditing();
        }
    };

    const title = project?.name ? `${project.name} / Cast Selection` : "Cast Selection";


    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader
                title={title}
                leftAction={
                    <button onClick={() => setIsTrashOpen(true)} className="p-1 text-black dark:text-white relative">
                        <Trash2 className="w-5 h-5" />
                        {deletedHeroes.length > 0 && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                                {deletedHeroes.length}
                            </motion.div>
                        )}
                    </button>
                }
            />
            <main ref={constraintsRef} className="flex-1 overflow-hidden p-4 relative">
                {castMembers.length === 0 ? (
                     <div className="absolute inset-0 flex items-center justify-center text-center text-zinc-500">
                        <div>
                            <FileText className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                            <h2 className="mt-4 font-bold text-lg">Cast Selection</h2>
                            <p className="text-sm mt-1">Click the button to add a new hero.</p>
                        </div>
                    </div>
                ) : (
                    castMembers.map((member) => (
                        <motion.div 
                            key={member.id} 
                            className="flex flex-col items-center gap-2 absolute cursor-grab active:cursor-grabbing"
                            drag
                            dragConstraints={constraintsRef}
                            dragMomentum={false}
                            whileDrag={{ scale: 1.1, zIndex: 10, boxShadow: "0px 10px 30px rgba(0,0,0,0.2)" }}
                            style={{ x: member.x || 0, y: member.y || 0 }}
                            onDragEnd={(event, info) => updateMemberPosition(member.id, info)}
                        >
                            <div className="relative">
                                <motion.div 
                                    onTap={() => onNavigate('heroDetail', { hero: member, project })}
                                    className="w-28 h-28 bg-teal-400 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                                
                                {(() => {
                                    let candidateToShow = null;
                                    if (member.primaryCandidateId) {
                                        candidateToShow = member.candidates?.find(c => c.id === member.primaryCandidateId && c.selectionData);
                                    }
                                    if (!candidateToShow) {
                                        candidateToShow = member.candidates?.find(c => c.selectionData);
                                    }

                                    if (candidateToShow?.selectionType === 'actor') {
                                        return (
                                            <div
                                                className="w-full h-full"
                                            >
                                                <img src={candidateToShow.selectionData.imageUrl} alt={candidateToShow.selectionData.name} className="w-full h-full object-cover" />
                                            </div>
                                        );
                                    }
                                    if (candidateToShow?.selectionType === 'image') {
                                        return <img src={candidateToShow.selectionData} alt="Selected" className="w-full h-full object-cover" />;
                                    }
                                    return (
                                        <div className="w-12 h-16 border-4 border-white rounded-md flex items-center justify-center bg-teal-400 pointer-events-none">
                                            <span className="text-white font-black text-3xl select-none">?</span>
                                        </div>
                                    );
                                })()}
                                </motion.div>
                                {/* Delete Button */}
                                <motion.button 
                                    onTap={(e) => {
                                        e.stopPropagation();
                                        removeCastMember(member.id);
                                    }}
                                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 hover:scale-110 transition-all z-10"
                                    aria-label="Remove hero"
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>
                            {editingMemberId === member.id ? (
                                <input
                                    type="text"
                                    value={member.name}
                                    onChange={(e) => handleNameChange(member.id, e.target.value)}
                                    onBlur={handleFinishEditing}
                                    onKeyDown={handleKeyDown}
                                    className="font-bold text-black dark:text-white bg-transparent border-b-2 border-black dark:border-white text-center w-28 outline-none"
                                    autoFocus
                                />
                            ) : (
                                <p 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingMemberId(member.id);
                                    }} 
                                    className="font-bold text-black dark:text-white cursor-pointer px-2 py-1"
                                >
                                    {member.name}
                                </p>
                            )}
                        </motion.div>
                    ))
                )}
                
                {/* Floating Action Button */}
                <div className="absolute bottom-4 right-4 flex flex-row gap-3">
                    <button
                        onClick={addCastMember}
                        className="bg-red-500 text-white rounded-full p-4 shadow-lg hover:bg-red-600 hover:scale-105 transition-all"
                        aria-label="Add hero"
                    >
                        <User className="w-6 h-6" />
                    </button>
                </div>
            </main>
            <TrashModal
                isOpen={isTrashOpen}
                onClose={() => setIsTrashOpen(false)}
                deletedHeroes={deletedHeroes}
                onRestore={handleRestoreHero}
                onPermanentDelete={handlePermanentDelete}
            />
        </div>
    );
}

function TrashModal({ isOpen, onClose, deletedHeroes, onRestore, onPermanentDelete }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[70vh]"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Deleted Heroes</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {deletedHeroes.length > 0 ? deletedHeroes.map(hero => (
                                <div key={hero.id} className="w-full flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-zinc-800">
                                    <div className="w-10 h-10 rounded-lg bg-teal-400 flex items-center justify-center text-white font-bold">{getInitials(hero.name)}</div>
                                    <div className="flex-1">
                                        <p className="font-bold text-left dark:text-white">{hero.name}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => onRestore(hero.id)} className="p-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-md hover:bg-green-200 dark:hover:bg-green-800">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onPermanentDelete(hero.id)} className="p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-center text-zinc-500 py-8">Trash is empty.</p>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function HeroDetailPage({ hero, onBack, myTeam, onUpdateHero, onNavigate, project, taskLists, setTaskLists }) {
    const [teamPopupOpenFor, setTeamPopupOpenFor] = useState(null); // Stores candidate ID
    const fileInputRef = useRef(null);
    const [uploadingForCandidateId, setUploadingForCandidateId] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [openSectionId, setOpenSectionId] = useState('roleDetails');
    const [editingNotesForClothingSection, setEditingNotesForClothingSection] = useState(null); // { index, notes }
    const [editingNotesForPropsSection, setEditingNotesForPropsSection] = useState(null);
    const [editingNotesForLocationSection, setEditingNotesForLocationSection] = useState(null); // { index, notes }
    const [editingClothingSectionTitleId, setEditingClothingSectionTitleId] = useState(null);
    const [editingPropsSectionTitleId, setEditingPropsSectionTitleId] = useState(null);
    const [editingLocationSectionTitleId, setEditingLocationSectionTitleId] = useState(null);
    const [openClothingSectionMenuId, setOpenClothingSectionMenuId] = useState(null);
    const [openPropsSectionMenuId, setOpenPropsSectionMenuId] = useState(null);
    const [openLocationSectionMenuId, setOpenLocationSectionMenuId] = useState(null);
    const [isSecondaryNotesModalOpen, setIsSecondaryNotesModalOpen] = useState(false);

    const addedActorBar = useMemo(() => {
        if (!hero.isPreProductionStarted || !taskLists) return null;

        const task = taskLists.find(list => list.searchQuery === 'Cast Selection');
        if (!task) return null;
        
        // Find the bar associated with this hero
        const heroBar = task.bars.find(bar => bar.heroId === hero.id);
        if (!heroBar) return null;

        // Now, find the primary candidate for this hero to display their info
        const primaryCandidate = hero.candidates?.find(
            c => c.id === hero.primaryCandidateId && c.selectionType === 'actor' && c.selectionData
        );

        if (primaryCandidate) {
            // Return a structure similar to the old one for rendering
            return {
                id: heroBar.id,
                selectedMember: primaryCandidate.selectionData,
                selectedService: heroBar.selectedService || primaryCandidate.selectionData.specialty
            };
        }
        
        return null;

    }, [hero.isPreProductionStarted, hero.id, hero.primaryCandidateId, hero.candidates, taskLists]);


    const handleClapperboardClick = (e) => {
        e.stopPropagation();

        if (!setTaskLists || !taskLists) {
            console.error("setTaskLists or taskLists function/prop is not available.");
            return;
        }

        if (hero.isPreProductionStarted) {
            // --- REMOVAL LOGIC ---
            // Remove any bar associated with this hero.id
            setTaskLists(prevTaskLists => 
                prevTaskLists.map(list => {
                    if (list.searchQuery === 'Cast Selection') {
                        const updatedBars = list.bars.filter(bar => bar.heroId !== hero.id);
                        // If no bars are left, add a default empty bar to avoid an empty list
                        if (updatedBars.length === 0) {
                            return { ...list, bars: [{ id: Date.now(), selectedMember: null, selectedService: null, isCombined: false }] };
                        }
                        return { ...list, bars: updatedBars };
                    }
                    return list;
                })
            );
            onUpdateHero({ ...hero, isPreProductionStarted: false });

        } else {
            // --- ADDITION LOGIC ---
            const serviceName = hero.name || 'Hero';

            setTaskLists(prevTaskLists => {
                const listIndex = prevTaskLists.findIndex(list => list.searchQuery === 'Cast Selection');
                
                // The new bar to represent this hero
                const newHeroBar = {
                    id: Date.now(),
                    heroId: hero.id, // Store hero ID as the reference
                    selectedService: serviceName,
                    isCombined: true, // Start collapsed as requested
                };

                if (listIndex > -1) {
                    // Cast Selection task list exists
                    const existingList = prevTaskLists[listIndex];
                    
                    // Check if a bar for this hero already exists
                    const isAlreadyAdded = existingList.bars.some(bar => bar.heroId === hero.id);

                    if (!isAlreadyAdded) {
                        // It's not there, so add it.
                        // Let's also clean up any completely empty placeholder bars first.
                        const cleanedBars = existingList.bars.filter(
                            b => b.selectedMember || b.selectedService || b.heroId
                        );

                        const updatedLists = [...prevTaskLists];
                        updatedLists[listIndex] = {
                            ...existingList,
                            bars: [...cleanedBars, newHeroBar]
                        };
                        return updatedLists;
                    }
                    return prevTaskLists; // Already added, do nothing.

                }  else {
                    // Cast Selection task list does not exist, create it.
                    const newTaskList = {
                        id: Date.now() + 1,
                        searchQuery: 'Cast Selection',
                        bars: [newHeroBar],
                        isMenuOpen: false,
                        showDates: false,
                        startDate: null,
                        endDate: null,
                        isCollapsed: false,
                        isNameConfirmed: true,
                        showProgress: false,
                        status: 'Pending',
                    };
                    return [...prevTaskLists, newTaskList];
                }
            });
            onUpdateHero({ ...hero, isPreProductionStarted: true });
        }
    };

    const updateCandidate = (candidateId, selectionType, selectionData) => {
        let isLastCandidateUpdated = false;
        const candidateIndex = hero.candidates.findIndex(c => c.id === candidateId);
        if (candidateIndex === hero.candidates.length - 1) {
            isLastCandidateUpdated = true;
        }

        const updatedCandidates = hero.candidates.map(candidate => {
            if (candidate.id === candidateId) {
                return {
                    ...candidate,
                    selectionType: selectionType,
                    selectionData: selectionData,
                    customName: selectionType === 'actor' ? '' : candidate.customName
                };
            }
            return candidate;
        });

        if (isLastCandidateUpdated) {
            updatedCandidates.push({ id: Date.now(), selectionType: null, selectionData: null, customName: '' });
        }
        onUpdateHero({ ...hero, candidates: updatedCandidates });
    };

    const handleNameChange = (candidateId, newName) => {
        const updatedCandidates = hero.candidates.map(c => 
            c.id === candidateId ? { ...c, customName: newName } : c
        );
        onUpdateHero({ ...hero, candidates: updatedCandidates });
    };
    
    const handleFinishNameEditing = () => {
        setEditingTitleId(null);
    };
    
    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleFinishNameEditing();
        }
    };

    if (!hero) {
        return (
            <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
                <PageHeader title="Hero Details" onBack={onBack} />
                <main className="flex-1 p-4 flex items-center justify-center">
                    <div className="text-center text-zinc-500">
                        <p>No hero selected.</p>
                    </div>
                </main>
            </div>
        );
    }

    const title = project?.name ? `${project.name} / ${hero.name}` : hero.name;

    const handleSetPrimary = (candidateId) => {
        onUpdateHero({ ...hero, primaryCandidateId: candidateId });
        setOpenMenuId(null); // Close the menu
    };

    const handleImageImportClick = (candidateId) => {
        setUploadingForCandidateId(candidateId);
        fileInputRef.current.click();
    };

    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file && uploadingForCandidateId) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newSelectionData = reader.result;
                updateCandidate(uploadingForCandidateId, 'image', newSelectionData);
                setUploadingForCandidateId(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddClothingSection = () => {
        const newSection = { id: Date.now(), name: `اختيار الملابس ${hero.clothingSections.length + 1}`, items: [], notes: '' };
        onUpdateHero({ ...hero, clothingSections: [...(Array.isArray(hero.clothingSections) ? hero.clothingSections : []), newSection] });
    };

    const handleAddPropsSection = () => {
        const newSection = { id: Date.now(), name: `Props ${hero.propsSections.length + 1}`, items: [], notes: '' };
        onUpdateHero({ ...hero, propsSections: [...(Array.isArray(hero.propsSections) ? hero.propsSections : []), newSection] });
    };

    const handleSelectActor = (actor) => {
        if (teamPopupOpenFor) {
            updateCandidate(teamPopupOpenFor, 'actor', actor);
            setTeamPopupOpenFor(null);
        }
    };

    const handleRemoveCandidate = (candidateIdToRemove) => {
        const candidateToRemove = hero.candidates.find(c => c.id === candidateIdToRemove);
        // Don't remove the last empty slot
        if (hero.candidates.length === 1 && !candidateToRemove.selectionData) return;

        const newCandidates = hero.candidates.filter(c => c.id !== candidateIdToRemove);
        onUpdateHero({ ...hero, candidates: newCandidates });
    };

    const handleRoleDetailsChange = (field, value) => {
        const updatedHero = {
            ...hero,
            roleDetails: {
                ...(hero.roleDetails || { name: '', age: '', details: '' }),
                [field]: value
            }
        };

        // If the name field in role details is changed, update the hero's main name as well.
        if (field === 'name') {
            updatedHero.name = value;
        }

        onUpdateHero(updatedHero);
    };

    const handleToggleSection = (sectionId) => {
        setOpenSectionId(prevId => (prevId === sectionId ? null : sectionId));
    };

    const handleClothingSectionNameChange = (sectionId, newName) => {
        const updatedSections = hero.clothingSections.map(section => 
            section.id === sectionId ? { ...section, name: newName } : section
        );
        onUpdateHero({ ...hero, clothingSections: updatedSections });
    };

    const handlePropsSectionNameChange = (sectionId, newName) => {
        const updatedSections = hero.propsSections.map(section => 
            section.id === sectionId ? { ...section, name: newName } : section
        );
        onUpdateHero({ ...hero, propsSections: updatedSections });
    };

    const handleRemoveClothingSection = (sectionId) => {
        const updatedSections = hero.clothingSections.filter(s => s.id !== sectionId);
        onUpdateHero({ ...hero, clothingSections: updatedSections });
    };

    const handleRemovePropsSection = (sectionId) => {
        const updatedSections = hero.propsSections.filter(s => s.id !== sectionId);
        onUpdateHero({ ...hero, propsSections: updatedSections });
    };

    const handleAddLocationSection = () => {
        const newSection = { id: Date.now(), name: `اختيار المواقع ${hero.locationSections.length + 1}`, items: [], notes: '' };
        onUpdateHero({ ...hero, locationSections: [...(Array.isArray(hero.locationSections) ? hero.locationSections : []), newSection] });
    };

    const handleLocationSectionNameChange = (sectionId, newName) => {
        const updatedSections = hero.locationSections.map(section => 
            section.id === sectionId ? { ...section, name: newName } : section
        );
        onUpdateHero({ ...hero, locationSections: updatedSections });
    };

    const handleRemoveLocationSection = (sectionId) => {
        const updatedSections = hero.locationSections.filter(s => s.id !== sectionId);
        onUpdateHero({ ...hero, locationSections: updatedSections });
    };

    return (
        <div className="h-full w-full flex flex-col bg-zinc-300 dark:bg-black">
            <PageHeader 
                title={title} 
                onBack={onBack}
                rightAction={
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleClapperboardClick}
                            className="p-1 text-black dark:text-white"
                        >
                            <Clapperboard className={`w-5 h-5 transition-colors ${hero.isPreProductionStarted ? 'fill-red-500 stroke-black' : ''}`}/>
                        </button>
                        <button onClick={(e) => e.stopPropagation()} className="p-1 text-black dark:text-white">
                            <Share2 className="w-5 h-5"/>
                        </button>
                    </div>
                }
            />
            <main className="flex-1 p-4 overflow-y-auto no-scrollbar">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                        className="hidden"
                        accept="image/*"
                    />
                    <div className="flex items-start gap-4 overflow-x-auto pb-4 -mx-4 px-4">
                    {(hero.candidates || []).map(candidate => {
                        const isPrimary = hero.primaryCandidateId === candidate.id;
                        return (
                        <div key={candidate.id} className={`bg-zinc-200 dark:bg-zinc-900 border-2 ${isPrimary ? 'border-yellow-400' : 'border-black dark:border-zinc-700'} rounded-lg overflow-hidden w-48 flex-shrink-0`}>
                            {/* Image Part */}
                            <div className="h-48 bg-black dark:bg-zinc-800">
                                {candidate.selectionType === 'actor' && candidate.selectionData ? (
                                    <button onClick={() => onNavigate('profile', candidate.selectionData)} className="w-full h-full">
                                        <img src={candidate.selectionData.imageUrl} alt={candidate.selectionData.name} className="w-full h-full object-cover" />
                                    </button>
                                ) : candidate.selectionType === 'image' && candidate.selectionData ? (
                                    <img src={candidate.selectionData} alt="Hero detail" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-zinc-400">
                                        <ImageIcon className="w-8 h-8" />
                                        <p className="text-xs mt-1">No image added</p>
                                    </div>
                                )}
                            </div>
                            {/* Name/Actions Part */}
                            <div className="p-2 border-t-2 border-black dark:border-zinc-700 flex items-center justify-between gap-2">
                                {editingTitleId === candidate.id ? (
                                    <input
                                        type="text"
                                        value={candidate.customName || (candidate.selectionType === 'actor' && candidate.selectionData ? candidate.selectionData.name : 'اضف مرشح')}
                                        onChange={(e) => handleNameChange(candidate.id, e.target.value)}
                                        onBlur={handleFinishNameEditing}
                                        onKeyDown={handleNameKeyDown}
                                        className="font-bold text-black dark:text-white bg-zinc-200 dark:bg-zinc-800 outline-none w-full p-1 rounded-sm flex-grow"
                                        autoFocus
                                    />
                                ) : (
                                    <p
                                        onClick={() => setEditingTitleId(candidate.id)}
                                        className="font-bold dark:text-white truncate cursor-pointer w-full flex-grow"
                                    >
                                        {candidate.customName || 
                                         (candidate.selectionType === 'actor' && candidate.selectionData
                                            ? candidate.selectionData.name
                                            : 'Add Candidate')}
                                    </p>
                                )}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {candidate.selectionData ? (
                                        <div className="relative">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)}
                                                className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                            <AnimatePresence>
                                                {openMenuId === candidate.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                                        transition={{ duration: 0.1 }}
                                                        className="absolute right-0 bottom-full mb-1 w-48 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-bottom-right p-1"
                                                    >
                                                        <button
                                                            onClick={() => handleSetPrimary(candidate.id)}
                                                            className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white"
                                                        >
                                                            <Star className={`w-4 h-4 transition-colors ${isPrimary ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                                                            <span>Set as Primary</span>
                                                        </button>
                                                        <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                                        <button
                                                            onClick={() => { setTeamPopupOpenFor(candidate.id); setOpenMenuId(null); }}
                                                            className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                            <span>Change Actor</span>
                                                        </button>
                                                        <button
                                                            onClick={() => { handleImageImportClick(candidate.id); setOpenMenuId(null); }}
                                                            className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white"
                                                        >
                                                            <ImageIcon className="w-4 h-4" />
                                                            <span>Change Image</span>
                                                        </button>
                                                        <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                                        <button
                                                            onClick={() => { handleRemoveCandidate(candidate.id); setOpenMenuId(null); }}
                                                            className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 text-sm"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            <span>Remove</span>
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ) : (
                                        <>
                                            <button onClick={() => setTeamPopupOpenFor(candidate.id)} className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                                                <UserPlus className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleImageImportClick(candidate.id)} className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors">
                                                <ImageIcon className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
                
                <AnimatePresence>
                {addedActorBar && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 bg-zinc-200 dark:bg-zinc-900 border-2 border-green-500/50 dark:border-green-500/50 rounded-lg p-3"
                    >
                        <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-500" />
                            <span>Added to Pre-production</span>
                        </h3>
                        <div className="mt-2">
                            <div key={addedActorBar.id} className="flex items-center gap-2 bg-zinc-300 dark:bg-zinc-800 p-1.5 rounded-md">
                                <img src={addedActorBar.selectedMember.imageUrl} alt={addedActorBar.selectedMember.name} className="w-8 h-8 rounded-full" />
                                <div>
                                    <p className="font-semibold text-sm dark:text-white">{addedActorBar.selectedMember.name}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{addedActorBar.selectedService || addedActorBar.selectedMember.specialty}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>

                {/* Modified section as requested */}
                <div className="bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg mt-4 flex flex-col shadow-sm">
                    {/* Top half: Role Details - now a button */}
                    <div className={`p-3 flex justify-between items-center ${openSectionId === 'roleDetails' ? 'border-b border-zinc-300 dark:border-zinc-800' : ''}`}>
                        <button onClick={() => handleToggleSection('roleDetails')} className="flex items-center gap-2 text-left flex-1">
                            <h3 className="font-bold text-black dark:text-white">Role Details</h3>
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsSecondaryNotesModalOpen(true)} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><FileText size={16} /></button>
                        </div>
                    </div>
                    
                    <AnimatePresence>
                        {openSectionId === 'roleDetails' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                {/* Bottom half: Input fields and now a text display */}
                                <div className="p-3 space-y-2">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            placeholder="Name" 
                                            value={hero.roleDetails?.name || ''}
                                            onChange={(e) => handleRoleDetailsChange('name', e.target.value)}
                                            className="flex-1 p-2 bg-zinc-300 dark:bg-zinc-800 rounded-md border-2 border-zinc-400 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Age" 
                                            value={hero.roleDetails?.age || ''}
                                            onChange={(e) => handleRoleDetailsChange('age', e.target.value)}
                                            className="w-20 p-2 bg-zinc-300 dark:bg-zinc-800 rounded-md border-2 border-zinc-400 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        />
                                    </div>
                                     <textarea
                                        placeholder="Details"
                                        value={hero.roleDetails?.details || ''}
                                        onChange={(e) => handleRoleDetailsChange('details', e.target.value)}
                                        className="w-full p-2 bg-zinc-300 dark:bg-zinc-800 rounded-md border-2 border-zinc-400 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white min-h-[76px] text-sm resize-none"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Sections for clothing selection */}
                {(Array.isArray(hero.clothingSections) ? hero.clothingSections : []).map((section, sectionIndex) => {
                    const isSectionOpen = openSectionId === section.id;
                    return (
                    <React.Fragment key={section.id}>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const newItem = { id: Date.now(), url: reader.result };
                                        const updatedSections = hero.clothingSections.map((s, idx) => 
                                            idx === sectionIndex ? { ...s, items: [...(s.items || []), newItem] } : s
                                        );
                                        onUpdateHero({ ...hero, clothingSections: updatedSections });
                                    };
                                    reader.readAsDataURL(file);
                                }
                                event.target.value = null; // To allow re-uploading the same file
                            }}
                        />
                        <div className="mt-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col">
                            <div className="p-2 flex justify-between items-center">
                                <button onClick={() => handleToggleSection(section.id)} className="flex items-center gap-2 text-left flex-1">
                                    {editingClothingSectionTitleId === section.id ? (
                                        <input
                                            type="text"
                                            value={section.name || ''}
                                            onChange={(e) => handleClothingSectionNameChange(section.id, e.target.value)}
                                            onBlur={() => setEditingClothingSectionTitleId(null)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingClothingSectionTitleId(null); }}
                                            className="font-bold text-black dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none"
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <div onClick={(e) => { e.stopPropagation(); setEditingClothingSectionTitleId(section.id); }} className="font-bold text-black dark:text-white">
                                            {section.name || `Clothing ${sectionIndex + 1}`}
                                        </div>
                                    )}
                                </button>
                                <div className="flex items-center gap-2">
                                    {/* This button finds its sibling input file to trigger it */}
                                    <button onClick={(e) => e.currentTarget.parentElement.parentElement.parentElement.previousElementSibling.click()} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><ImageIcon size={16} /></button>
                                    <button onClick={() => setEditingNotesForClothingSection({ index: sectionIndex, notes: section.notes })} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><FileText size={16} /></button>
                                    
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenClothingSectionMenuId(prevId => prevId === section.id ? null : section.id)}
                                            className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        <AnimatePresence>
                                            {openClothingSectionMenuId === section.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right p-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Share2 size={16} /><span>Share</span>
                                                    </button>
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <UserPlus size={16} /><span>Add Person</span>
                                                    </button>
                                                    <button onClick={() => { handleAddClothingSection(); setOpenClothingSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Plus size={16} /><span>Add New Section</span>
                                                    </button>
                                                    {sectionIndex > 0 && (
                                                        <>
                                                            <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                                            <button onClick={() => { handleRemoveClothingSection(section.id); setOpenClothingSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400">
                                                                <Trash2 size={16} />
                                                                <span>Delete Section</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {isSectionOpen && (
                                     <motion.div
                                        initial="collapsed"
                                        animate="open"
                                        exit="collapsed"
                                        variants={{
                                            open: { opacity: 1, height: "auto" },
                                            collapsed: { opacity: 0, height: 0 }
                                        }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-zinc-300 dark:border-zinc-700">
                                            <div className="p-2">
                                                {(section.items && section.items.length > 0) ? (
                                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
                                                        {section.items.map(item => (
                                                            <div key={item.id} className="relative w-28 h-28 flex-shrink-0 rounded-md overflow-hidden border-2 border-zinc-400 dark:border-zinc-700 group">
                                                                <img src={item.url} alt="Clothing item" className="w-full h-full object-cover" />
                                                                <button 
                                                                    onClick={() => {
                                                                        const updatedSections = hero.clothingSections.map((s, idx) => 
                                                                            idx === sectionIndex ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s
                                                                        );
                                                                        onUpdateHero({ ...hero, clothingSections: updatedSections });
                                                                    }}
                                                                    className="absolute top-1 right-1 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-12 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                                                        No clothing added
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </React.Fragment>
                )})}

                {/* Sections for Props selection */}
                {(Array.isArray(hero.propsSections) ? hero.propsSections : []).map((section, sectionIndex) => {
                    const isSectionOpen = openSectionId === section.id;
                    return (
                    <React.Fragment key={section.id}>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const newItem = { id: Date.now(), url: reader.result };
                                        const updatedSections = hero.propsSections.map((s, idx) => 
                                            idx === sectionIndex ? { ...s, items: [...(s.items || []), newItem] } : s
                                        );
                                        onUpdateHero({ ...hero, propsSections: updatedSections });
                                    };
                                    reader.readAsDataURL(file);
                                }
                                event.target.value = null; // To allow re-uploading the same file
                            }}
                        />
                        <div className="mt-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col">
                            <div className="p-2 flex justify-between items-center">
                                <button onClick={() => handleToggleSection(section.id)} className="flex items-center gap-2 text-left flex-1">
                                    {editingPropsSectionTitleId === section.id ? (
                                        <input
                                            type="text"
                                            value={section.name || ''}
                                            onChange={(e) => handlePropsSectionNameChange(section.id, e.target.value)}
                                            onBlur={() => setEditingPropsSectionTitleId(null)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingPropsSectionTitleId(null); }}
                                            className="font-bold text-black dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none"
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <div onClick={(e) => { e.stopPropagation(); setEditingPropsSectionTitleId(section.id); }} className="font-bold text-black dark:text-white">
                                            {section.name || `Props ${sectionIndex + 1}`}
                                        </div>
                                    )}
                                </button>
                                <div className="flex items-center gap-2">
                                    {/* This button finds its sibling input file to trigger it */}
                                    <button onClick={(e) => e.currentTarget.parentElement.parentElement.parentElement.previousElementSibling.click()} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><ImageIcon size={16} /></button>
                                    <button onClick={() => setEditingNotesForPropsSection({ index: sectionIndex, notes: section.notes })} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><FileText size={16} /></button>
                                    
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenPropsSectionMenuId(prevId => prevId === section.id ? null : section.id)}
                                            className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        <AnimatePresence>
                                            {openPropsSectionMenuId === section.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right p-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Share2 size={16} /><span>Share</span>
                                                    </button>
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <UserPlus size={16} /><span>Add Person</span>
                                                    </button>
                                                    <button onClick={() => { handleAddPropsSection(); setOpenPropsSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Plus size={16} /><span>Add New Section</span>
                                                    </button>
                                                    {sectionIndex > 0 && (
                                                        <>
                                                            <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                                            <button onClick={() => { handleRemovePropsSection(section.id); setOpenPropsSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400">
                                                                <Trash2 size={16} />
                                                                <span>Delete Section</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {isSectionOpen && (
                                     <motion.div
                                        initial="collapsed"
                                        animate="open"
                                        exit="collapsed"
                                        variants={{
                                            open: { opacity: 1, height: "auto" },
                                            collapsed: { opacity: 0, height: 0 }
                                        }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-zinc-300 dark:border-zinc-700">
                                            <div className="p-2">
                                                {(section.items && section.items.length > 0) ? (
                                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
                                                        {section.items.map(item => (
                                                            <div key={item.id} className="relative w-28 h-28 flex-shrink-0 rounded-md overflow-hidden border-2 border-zinc-400 dark:border-zinc-700 group">
                                                                <img src={item.url} alt="Props item" className="w-full h-full object-cover" />
                                                                <button 
                                                                    onClick={() => {
                                                                        const updatedSections = hero.propsSections.map((s, idx) => 
                                                                            idx === sectionIndex ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s
                                                                        );
                                                                        onUpdateHero({ ...hero, propsSections: updatedSections });
                                                                    }}
                                                                    className="absolute top-1 right-1 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-12 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                                                        No props added
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </React.Fragment>
                )})}

                {/* Sections for location selection */}
                {(Array.isArray(hero.locationSections) ? hero.locationSections : []).map((section, sectionIndex) => {
                    const isSectionOpen = openSectionId === section.id;
                    return (
                    <React.Fragment key={section.id}>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(event) => {
                                const file = event.target.files[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        const newItem = { id: Date.now(), url: reader.result };
                                        const updatedSections = hero.locationSections.map((s, idx) => 
                                            idx === sectionIndex ? { ...s, items: [...(s.items || []), newItem] } : s
                                        );
                                        onUpdateHero({ ...hero, locationSections: updatedSections });
                                    };
                                    reader.readAsDataURL(file);
                                }
                                event.target.value = null; // To allow re-uploading the same file
                            }}
                        />
                        <div className="mt-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col">
                            <div className="p-2 flex justify-between items-center">
                                <button onClick={() => handleToggleSection(section.id)} className="flex items-center gap-2 text-left flex-1">
                                    {editingLocationSectionTitleId === section.id ? (
                                        <input
                                            type="text"
                                            value={section.name || ''}
                                            onChange={(e) => handleLocationSectionNameChange(section.id, e.target.value)}
                                            onBlur={() => setEditingLocationSectionTitleId(null)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setEditingLocationSectionTitleId(null); }}
                                            className="font-bold text-black dark:text-white bg-transparent border-b-2 border-black dark:border-white outline-none"
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <div onClick={(e) => { e.stopPropagation(); setEditingLocationSectionTitleId(section.id); }} className="font-bold text-black dark:text-white">
                                            {section.name || `Locations ${sectionIndex + 1}`}
                                        </div>
                                    )}
                                </button>
                                <div className="flex items-center gap-2">
                                    {/* This button finds its sibling input file to trigger it */}
                                    <button onClick={(e) => e.currentTarget.parentElement.parentElement.parentElement.previousElementSibling.click()} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><ImageIcon size={16} /></button>
                                    <button onClick={() => setEditingNotesForLocationSection({ index: sectionIndex, notes: section.notes })} className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"><FileText size={16} /></button>
                                    
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenLocationSectionMenuId(prevId => prevId === section.id ? null : section.id)}
                                            className="p-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full text-black dark:text-white hover:bg-zinc-400 dark:hover:bg-zinc-600 transition-colors"
                                        >
                                            <MoreVertical size={16} />
                                        </button>
                                        <AnimatePresence>
                                            {openLocationSectionMenuId === section.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                                    className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right p-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Share2 size={16} /><span>Share</span>
                                                    </button>
                                                    <button className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <UserPlus size={16} /><span>Add Person</span>
                                                    </button>
                                                    <button onClick={() => { handleAddLocationSection(); setOpenLocationSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm dark:text-white">
                                                        <Plus size={16} /><span>Add New Section</span>
                                                    </button>
                                                    {sectionIndex > 0 && (
                                                        <>
                                                            <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                                            <button onClick={() => { handleRemoveLocationSection(section.id); setOpenLocationSectionMenuId(null); }} className="w-full flex items-center gap-2 text-left p-2 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400">
                                                                <Trash2 size={16} />
                                                                <span>Delete Section</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {isSectionOpen && (
                                     <motion.div
                                        initial="collapsed"
                                        animate="open"
                                        exit="collapsed"
                                        variants={{
                                            open: { opacity: 1, height: "auto" },
                                            collapsed: { opacity: 0, height: 0 }
                                        }}
                                        transition={{ duration: 0.3, ease: "easeInOut" }}
                                        className="overflow-hidden"
                                    >
                                        <div className="border-t border-zinc-300 dark:border-zinc-700">
                                            <div className="p-2">
                                                {(section.items && section.items.length > 0) ? (
                                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mb-2">
                                                        {section.items.map(item => (
                                                            <div key={item.id} className="relative w-28 h-28 flex-shrink-0 rounded-md overflow-hidden border-2 border-zinc-400 dark:border-zinc-700 group">
                                                                <img src={item.url} alt="Location item" className="w-full h-full object-cover" />
                                                                <button 
                                                                    onClick={() => {
                                                                        const updatedSections = hero.locationSections.map((s, idx) => 
                                                                            idx === sectionIndex ? { ...s, items: s.items.filter(i => i.id !== item.id) } : s
                                                                        );
                                                                        onUpdateHero({ ...hero, locationSections: updatedSections });
                                                                    }}
                                                                    className="absolute top-1 right-1 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="h-12 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400">
                                                        No locations added
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </React.Fragment>
                )})}

                {/* Shooting Dates Section */}
                <div className="mt-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col">
                    <div className="p-2 flex justify-between items-center">
                        <button onClick={() => handleToggleSection('shootingDates')} className="flex items-center gap-2 text-left flex-1">
                            <h3 className="font-bold text-black dark:text-white">Shooting Dates</h3>
                        </button>
                    </div>
                    <AnimatePresence>
                        {openSectionId === 'shootingDates' && (
                             <motion.div
                                initial="collapsed"
                                animate="open"
                                exit="collapsed"
                                variants={{
                                    open: { opacity: 1, height: "auto" },
                                    collapsed: { opacity: 0, height: 0 }
                                }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                            >
                                <div className="border-t border-zinc-300 dark:border-zinc-700">
                                    <div className="p-2">
                                        <div className="h-48 flex items-center justify-center text-xs text-zinc-500 dark:text-zinc-400 border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-md">
                                            Shooting schedule will be built here
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                 {/* New empty bar as requested */}
                <div className="mt-4 bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg h-12">
                    {/* This div is intentionally left empty */}
                </div>
            </main>
            <TeamMemberPopup
                isOpen={!!teamPopupOpenFor}
                onClose={() => setTeamPopupOpenFor(null)}
                onSelectUser={handleSelectActor}
                myTeam={myTeam}
            />
            <ClothingNotesModal
                title="Clothing Notes"
                isOpen={!!editingNotesForClothingSection}
                onClose={() => setEditingNotesForClothingSection(null)}
                initialNotes={editingNotesForClothingSection?.notes || ''}
                onSave={(newNotes) => {
                    if (editingNotesForClothingSection === null) return;
                    const updatedSections = hero.clothingSections.map((s, index) => 
                        index === editingNotesForClothingSection.index ? { ...s, notes: newNotes } : s
                    );
                    onUpdateHero({ ...hero, clothingSections: updatedSections });
                }}
            />
            <ClothingNotesModal
                title="Props Notes"
                isOpen={!!editingNotesForPropsSection}
                onClose={() => setEditingNotesForPropsSection(null)}
                initialNotes={editingNotesForPropsSection?.notes || ''}
                onSave={(newNotes) => {
                    if (editingNotesForPropsSection === null) return;
                    const updatedSections = hero.propsSections.map((s, index) => 
                        index === editingNotesForPropsSection.index ? { ...s, notes: newNotes } : s
                    );
                    onUpdateHero({ ...hero, propsSections: updatedSections });
                }}
            />
            <ClothingNotesModal
                title="Location Notes"
                isOpen={!!editingNotesForLocationSection}
                onClose={() => setEditingNotesForLocationSection(null)}
                initialNotes={editingNotesForLocationSection?.notes || ''}
                onSave={(newNotes) => {
                    if (editingNotesForLocationSection === null) return;
                    const updatedSections = hero.locationSections.map((s, index) => 
                        index === editingNotesForLocationSection.index ? { ...s, notes: newNotes } : s
                    );
                    onUpdateHero({ ...hero, locationSections: updatedSections });
                }}
            />
            <ClothingNotesModal
                title="Secondary Notes"
                isOpen={isSecondaryNotesModalOpen}
                onClose={() => setIsSecondaryNotesModalOpen(false)}
                initialNotes={hero.roleDetails?.secondaryNotes || ''}
                onSave={(newNotes) => {
                    handleRoleDetailsChange('secondaryNotes', newNotes);
                }}
            />
        </div>
    );
}
function ShootingTablePage({ onBack, project }) {
    const title = project?.name ? `${project.name} / Shooting Table` : "Shooting Table";
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                 <div className="flex items-center justify-center relative h-8">
                    <h1 className="font-bold text-lg dark:text-white">{title}</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                <div className="text-center text-zinc-500">
                    <Calendar className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm mt-1">This page will be built in the next step.</p>
                </div>
            </main>
        </div>
    );
}

function PostCard({ post, onProfileSelect }) {
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden">
            <div className="p-3 flex items-center gap-3">
                <button onClick={() => onProfileSelect(post.user)}>
                    <img src={post.user.imageUrl} alt={post.user.name} className="w-10 h-10 rounded-full" />
                </button>
                <div className="flex-1">
                    <button onClick={() => onProfileSelect(post.user)} className="font-bold dark:text-white">{post.user.name}</button>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{post.timestamp}</p>
                </div>
                <button className="p-2 text-zinc-500 dark:text-zinc-400">
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </div>
            {post.text && <p className="px-3 pb-3 text-sm dark:text-zinc-200">{post.text}</p>}
            {post.image && (
                <div className="bg-zinc-100 dark:bg-zinc-800">
                    <img src={post.image} alt="Post content" className="w-full h-auto max-h-[400px] object-cover" />
                </div>
            )}
            <div className="p-3 flex items-center justify-start gap-4 text-zinc-600 dark:text-zinc-400">
                <button className="flex items-center gap-1.5 hover:text-red-500">
                    <Heart className="w-5 h-5" />
                    <span className="text-sm font-semibold">{post.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-500">
                    <MessageCircleIcon className="w-5 h-5" />
                    <span className="text-sm font-semibold">{post.comments}</span>
                </button>
            </div>
        </div>
    );
}

function SpotPage({ onBack, onProfileSelect, onCompanySelect }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Spot" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                {MOCK_POSTS.length > 0 ? (
                    MOCK_POSTS.map(post => (
                        <PostCard key={post.id} post={post} onProfileSelect={onProfileSelect} />
                    ))
                ) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10 flex flex-col items-center">
                        <Newspaper className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold text-lg">No Posts Yet</h2>
                        <p className="text-sm mt-1 max-w-xs">There are no news posts available at the moment.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function StarPage({ profile, onBack, onAssignToProject, onAddToTeam, myTeam, onStartChat, onMediaSelect, isCurrentUser = false }) {
    if (!profile) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-100 dark:bg-black">
                <p className="text-zinc-500 dark:text-zinc-400">Profile not found.</p>
            </div>
        );
    }
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                <div className="flex items-center justify-end gap-2 px-2 pt-3 pb-2 h-14">
                    {/* Back button removed */}
                    {isCurrentUser && <button className="p-2 dark:text-white"><Edit3 className="w-5 h-5" /></button>}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                <ProfileHeaderCard profile={profile} onAssignToProject={onAssignToProject} onAddToTeam={onAddToTeam} myTeam={myTeam} onStartChat={onStartChat} />
                <StatsCard stats={profile.stats} />
                <AboutSection about={profile.about} skills={profile.skills} bio={profile.bio} />
                <PostsSection posts={MOCK_POSTS.filter(p => p.user.id === profile.id)} isCurrentUser={isCurrentUser} />
                <GalleryCard onMediaSelect={onMediaSelect} />
                <AwardsCard />
                <InfoCard title="Contact" icon={Phone} items={['Agent: +20123456789', 'Email: contact@domain.com']} />
                <InfoCard title="Social Media" icon={Globe} items={[]} isSocial={true} />
                <div className="h-4" />
            </main>
        </div>
    );
}

function CompanyDetailPage({ company, onBack, onAddToTeam, myTeam, onStartChat, onMediaSelect, onAssignToProject }) {
    if (!company) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-zinc-100 dark:bg-black">
                <p className="text-zinc-500 dark:text-zinc-400">Company not found.</p>
            </div>
        );
    }
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <header className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
                <div className="flex items-center gap-2 px-2 pt-3 pb-2 h-14">
                    {/* Back button removed */}
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                <CompanyHeaderCard company={company} onAddToTeam={onAddToTeam} myTeam={myTeam} onStartChat={onStartChat} onAssignToProject={onAssignToProject} />
                <StatsCard stats={company.stats} />
                <AboutSection about={company.about} skills={company.services} skillsTitle="Services" />
                <GalleryCard onMediaSelect={onMediaSelect} />
                <InfoCard title="Contact" icon={Phone} items={['Office: +20123456789', 'Email: contact@company.com']} />
                <InfoCard title="Social Media" icon={Globe} items={[]} isSocial={true} />
                <div className="h-4" />
            </main>
        </div>
    );
}

function ProjectInfoCard({ project, onEdit, isCollapsed, onToggleCollapse }) {
    const isOneDayShoot = project.oneDayShoot || (project.endDate && project.startDate && project.startDate === project.endDate);

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden mb-4">
            <div className="w-full flex justify-between items-start p-4">
                <button onClick={onToggleCollapse} className="flex-1 text-left">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><FileText size={18} /> Project Details</h3>
                </button>
                <button onClick={onEdit} className="p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white flex-shrink-0">
                    <Edit3 className="w-5 h-5" />
                </button>
            </div>
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t-2 border-zinc-100 dark:border-zinc-800 pt-3">
                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">Summary</h4>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{project.description || "No summary provided."}</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md">
                                    <Calendar size={16} className="text-zinc-500 dark:text-zinc-400" />
                                    <div className="flex-1">
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Shooting Schedule</div>
                                        <div className="font-semibold dark:text-white">
                                            {isOneDayShoot ? `${project.startDate} (One Day)` : `${project.startDate || 'TBD'} to ${project.endDate || 'TBD'}`}
                                        </div>
                                    </div>
                                </div>
                                 <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md">
                                    <Trophy size={16} className="text-zinc-500 dark:text-zinc-400" />
                                    <div className="flex-1">
                                        <div className="text-xs text-zinc-500 dark:text-zinc-400">Delivery / Release Date</div>
                                        <div className="font-semibold dark:text-white">{project.deliveryDate || 'TBD'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function RoleSelectionModal({ isOpen, onClose, onSelectRole, currentRole }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select Role</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-2">
                            {ADMIN_ROLES.map(role => (
                                <button
                                    key={role}
                                    onClick={() => onSelectRole(role)}
                                    className={`w-full p-2 rounded-md text-sm font-semibold text-left flex items-center justify-between ${currentRole === role ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-white'}`}
                                >
                                    <span>{role}</span>
                                    {currentRole === role && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ProjectListModal({ isOpen, onClose, title, projects, actions }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
        {isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[70vh]"
                >
                    <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                        <div className="flex justify-between items-center dark:text-white">
                            <h2 className="font-bold text-lg">{title}</h2>
                            <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                        </div>
                    </header>
                    <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                        {projects.length > 0 ? projects.map(project => (
                            <div key={project.id} className="w-full flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-zinc-800">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center text-white font-bold"><PartyPopper size={20} /></div>
                                <div className="flex-1">
                                    <p className="font-bold text-left dark:text-white">{project.name}</p>
                                </div>
                                <div className="flex gap-2">
                                    {actions.map(action => {
                                        const ActionIcon = action.icon;
                                        return (
                                            <button key={action.label} onClick={() => action.handler(project.id)} className={`p-2 rounded-md ${action.className}`}>
                                                <ActionIcon className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-zinc-500 py-8">لا توجد مشاريع هنا.</p>
                        )}
                    </main>
                </motion.div>
            </motion.div>
        )}
        </AnimatePresence>
    );
}

function ProjectTypeSelectionModal({ isOpen, onClose, projectTypes, onSelect, currentType }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[60vh]"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select Project Type</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-2 overflow-y-auto">
                            {projectTypes.map(type => (
                                <button
                                    key={type}
                                    onClick={() => onSelect(type)}
                                    className={`w-full p-2 rounded-md text-sm font-semibold text-left flex items-center justify-between ${currentType === type ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-white'}`}
                                >
                                    <span>{type}</span>
                                    {currentType === type && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function ProjectsPage({ projects, onProjectSelect, searchQuery, onSearchChange, onBack, onCreateDreamProject, dreamProjects, setDreamProjects }) {
    const hasProjects = projects.length > 0;
    const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const [openMenuId, setOpenMenuId] = useState(null);
    const menuRef = useRef(null);
    const coverPhotoInputRef = useRef(null);
    const [editingProjectId, setEditingProjectId] = useState(null);
    const [selectingTypeForProject, setSelectingTypeForProject] = useState(null);

    const [savedProjects, setSavedProjects] = useState(() => JSON.parse(localStorage.getItem('oneCrewSavedProjects')) || []);
    const [deletedProjects, setDeletedProjects] = useState(() => JSON.parse(localStorage.getItem('oneCrewDeletedProjects')) || []);
    const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
    const [isDeletedModalOpen, setIsDeletedModalOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('oneCrewSavedProjects', JSON.stringify(savedProjects));
    }, [savedProjects]);
    useEffect(() => {
        localStorage.setItem('oneCrewDeletedProjects', JSON.stringify(deletedProjects));
    }, [deletedProjects]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleEditName = (project) => {
        setEditingProjectId(project.id);
        setOpenMenuId(null);
    };

    const handleNameChange = (projectId, newName) => {
        setDreamProjects(prev =>
            prev.map(p => (p.id === projectId ? { ...p, name: newName } : p))
        );
    };
    
    const finishEditingName = () => {
        setEditingProjectId(null);
    };
    
    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            finishEditingName();
        }
    };

    const handleCoverPhotoUpload = (project) => {
        const input = coverPhotoInputRef.current;
        if (input) {
            input.setAttribute('data-project-id', project.id);
            input.click();
        }
        setOpenMenuId(null);
    };

    const handleCoverPhotoChange = (e) => {
        const file = e.target.files[0];
        const projectId = parseInt(e.target.getAttribute('data-project-id'), 10);

        if (file && projectId) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setDreamProjects(prevProjects =>
                    prevProjects.map(p =>
                        p.id === projectId ? { ...p, coverPhoto: event.target.result } : p
                    )
                );
            };
            reader.readAsDataURL(file);
        }
        e.target.value = null;
    };

    const handleSave = (projectId) => {
        const projectToMove = dreamProjects.find(p => p.id === projectId);
        if (projectToMove) {
            setSavedProjects(prev => [...prev, projectToMove]);
            setDreamProjects(prev => prev.filter(p => p.id !== projectId));
        }
        setOpenMenuId(null);
    };

    const handleDelete = (projectId) => {
        const projectToMove = dreamProjects.find(p => p.id === projectId);
        if (projectToMove) {
            setDeletedProjects(prev => [...prev, projectToMove]);
            setDreamProjects(prev => prev.filter(p => p.id !== projectId));
        }
        setOpenMenuId(null);
    };

    const handleRestoreFromSaved = (projectId) => {
        const projectToMove = savedProjects.find(p => p.id === projectId);
        if (projectToMove) {
            setDreamProjects(prev => [...prev, projectToMove]);
            setSavedProjects(prev => prev.filter(p => p.id !== projectId));
        }
    };
    
    const handleRestoreFromDeleted = (projectId) => {
        const projectToMove = deletedProjects.find(p => p.id === projectId);
        if (projectToMove) {
            setDreamProjects(prev => [...prev, projectToMove]);
            setDeletedProjects(prev => prev.filter(p => p.id !== projectId));
        }
    };

    const handlePermanentDelete = (projectId) => {
        setDeletedProjects(prev => prev.filter(p => p.id !== projectId));
    };

    const handleDuplicateProject = () => {
        setDreamProjects(prevProjects => {
            const maxId = prevProjects.reduce((max, p) => Math.max(p.id, max), 0);
            const newId = maxId + 1;
            const newProject = {
                id: newId,
                name: `Project ${newId}`
            };
            return [...prevProjects, newProject];
        });
    };

    const projectTypes = ["Ad", "Film", "Series", "Music Video", "Event", "Documentary", "Short Film"];

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black relative">
            <PageHeader title="My Projects" searchQuery={searchQuery} onSearchChange={onSearchChange} onBack={onBack} />
            <input
                type="file"
                ref={coverPhotoInputRef}
                onChange={handleCoverPhotoChange}
                className="hidden"
                accept="image/*"
            />
            <main className="flex-1 overflow-y-auto p-3 pb-24">
                <div className="grid grid-cols-1 gap-4">
                    {dreamProjects.map(project => {
                        const hasCoverPhoto = !!project.coverPhoto;
                        const style = hasCoverPhoto
                            ? {
                                backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%), url(${project.coverPhoto})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                            }
                            : {};

                        return (
                            <div key={project.id} className="relative">
                                <div
                                    onClick={() => {
                                        if (editingProjectId !== project.id) {
                                            onCreateDreamProject(project);
                                        }
                                    }}
                                    className={`w-full text-white font-bold h-44 p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer relative ${!hasCoverPhoto ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''}`}
                                    style={style}
                                >
                                    {editingProjectId === project.id ? (
                                        <input
                                            type="text"
                                            value={project.name}
                                            onChange={(e) => handleNameChange(project.id, e.target.value)}
                                            onBlur={finishEditingName}
                                            onKeyDown={handleNameKeyDown}
                                            onClick={(e) => e.stopPropagation()}
                                            autoFocus
                                            className="text-2xl absolute bottom-2 left-4 bg-transparent border-b-2 border-white/70 outline-none text-white font-bold w-3/4 z-10"
                                        />
                                    ) : (
                                        <div 
                                            className="absolute bottom-2 left-4 cursor-text p-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditName(project);
                                            }}
                                        >
                                            <h2 className="text-2xl">{project.name}</h2>
                                            {project.projectType && (
                                                <p className="text-sm font-normal text-white/90">{project.projectType}</p>
                                            )}
                                        </div>
                                    )}
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === project.id ? null : project.id); }} className="p-1 rounded-full hover:bg-white/20 absolute bottom-4 right-4">
                                        <MoreVertical className="w-6 h-6" />
                                    </button>
                                </div>
                                <AnimatePresence>
                                {openMenuId === project.id && (
                                    <motion.div
                                        ref={menuRef}
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute right-3 top-16 w-40 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-20 origin-top-right p-1"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); handleEditName(project); }} className="w-full text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-semibold dark:text-white flex items-center gap-2">
                                            <Edit3 size={16} /> Edit Name
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectingTypeForProject(project); setOpenMenuId(null); }} className="w-full text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-semibold dark:text-white flex items-center gap-2">
                                            <Briefcase size={16} /> Project Type
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleCoverPhotoUpload(project); }} className="w-full text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-semibold dark:text-white flex items-center gap-2">
                                            <ImageIcon size={16} /> Cover Photo
                                        </button>
                                        <button onClick={() => handleSave(project.id)} className="w-full text-left p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm font-semibold dark:text-white flex items-center gap-2">
                                            <FolderClosed size={16} /> Save
                                        </button>
                                        <button onClick={() => handleDelete(project.id)} className="w-full text-left p-2 rounded-md text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 flex items-center gap-2">
                                            <Trash2 size={16} /> Delete
                                        </button>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                     {hasProjects ? (
                        filteredProjects.map(project => <ProjectCard key={project.id} project={project} onSelect={onProjectSelect} />)
                    ) : (
                        <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10 flex flex-col items-center">
                           <Clapperboard className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                           <h2 className="mt-4 font-bold text-lg">No Projects Yet</h2>
                           <p className="text-sm mt-1 max-w-xs">Start by creating a new dream project.</p>
                        </div>
                    )}
                </div>
            </main>
            {/* Fade effect */}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-zinc-50 dark:from-black to-transparent pointer-events-none z-5" />
            <div className="absolute bottom-6 inset-x-0 flex justify-center items-center gap-4 z-10">
                {/* Small button left */}
                <Press
                    onClick={() => setIsSavedModalOpen(true)}
                    className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all duration-300 active:scale-95 relative"
                >
                    <FolderClosed className="w-6 h-6" />
                    {savedProjects.length > 0 && (
                        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-50 dark:border-black">
                            {savedProjects.length}
                        </div>
                    )}
                </Press>

                {/* Main button */}
                <Press
                    onClick={handleDuplicateProject}
                    className="w-20 h-20 bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white font-bold rounded-full flex items-center justify-center shadow-lg hover:shadow-pink-500/40 dark:hover:shadow-pink-400/30 transition-all duration-300 active:scale-95"
                >
                    <Sparkles className="w-8 h-8" />
                </Press>

                {/* Small button right */}
                <Press
                    onClick={() => setIsDeletedModalOpen(true)}
                    className="w-12 h-12 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full flex items-center justify-center shadow-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-all duration-300 active:scale-95 relative"
                >
                    <Trash2 className="w-6 h-6" />
                    {deletedProjects.length > 0 && (
                        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-zinc-50 dark:border-black">
                            {deletedProjects.length}
                        </div>
                    )}
                </Press>
            </div>
             <ProjectListModal
                isOpen={isSavedModalOpen}
                onClose={() => setIsSavedModalOpen(false)}
                title="المشاريع المحفوظة"
                projects={savedProjects}
                actions={[
                    { label: "استعادة", handler: handleRestoreFromSaved, icon: RefreshCw, className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800" },
                ]}
            />
            <ProjectListModal
                isOpen={isDeletedModalOpen}
                onClose={() => setIsDeletedModalOpen(false)}
                title="المشاريع المحذوفة"
                projects={deletedProjects}
                actions={[
                    { label: "استعادة", handler: handleRestoreFromDeleted, icon: RefreshCw, className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800" },
                    { label: "حذف نهائي", handler: handlePermanentDelete, icon: Trash2, className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800" },
                ]}
            />
            <ProjectTypeSelectionModal
                isOpen={!!selectingTypeForProject}
                onClose={() => setSelectingTypeForProject(null)}
                projectTypes={projectTypes}
                currentType={selectingTypeForProject?.projectType}
                onSelect={(type) => {
                    if (selectingTypeForProject) {
                        setDreamProjects(prev =>
                            prev.map(p => (p.id === selectingTypeForProject.id ? { ...p, projectType: type } : p))
                        );
                    }
                    setSelectingTypeForProject(null);
                }}
            />
        </div>
    );
}

function TeamMemberPopup({ isOpen, onClose, onSelectUser, myTeam }) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTeam = useMemo(() => {
        if (!searchQuery) return myTeam;
        return myTeam.filter(member => 
            member.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [myTeam, searchQuery]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[60vh]"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-shrink-0">
                             <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select from My Team</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <div className="p-3 border-b-2 border-black dark:border-zinc-700 flex-shrink-0">
                             <SearchBar value={searchQuery} onChange={setSearchQuery} />
                        </div>
                        <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {filteredTeam.length > 0 ? filteredTeam.map(profile => (
                                <button key={profile.id} onClick={() => onSelectUser(profile)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                    <img src={profile.imageUrl} className="w-10 h-10 rounded-full" alt={profile.name} />
                                    <div>
                                        <p className="font-bold text-left dark:text-white">{profile.name}</p>
                                        <p className="text-xs text-left text-zinc-500 dark:text-zinc-400">{profile.specialty}</p>
                                    </div>
                                </button>
                            )) : (
                                <p className="text-center text-zinc-500 py-8">No users found.</p>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ServiceSelectionPopup({ isOpen, onClose, onSelectService, taskName }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowAll(false);
            setSearchQuery('');
        }
    }, [isOpen]);

    const suggestedServices = useMemo(() => {
        if (taskName && TASK_TO_SERVICE_SUGGESTIONS[taskName]) {
            return TASK_TO_SERVICE_SUGGESTIONS[taskName];
        }
        return []; // Return empty if no specific suggestions
    }, [taskName]);

    const servicesToDisplay = useMemo(() => {
        if (showAll || suggestedServices.length === 0) {
            return ALL_SERVICE_LABELS;
        }
        return suggestedServices;
    }, [showAll, suggestedServices]);

    const filteredServices = useMemo(() => {
        if (!searchQuery) return servicesToDisplay;
        return servicesToDisplay.filter(label => label.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, servicesToDisplay]);

    const canShowMore = !showAll && suggestedServices.length > 0 && suggestedServices.length < ALL_SERVICE_LABELS.length;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[60vh]"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 flex-shrink-0">
                             <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select Service</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                         <div className="p-3 border-b-2 border-black dark:border-zinc-700 flex-shrink-0">
                             <SearchBar value={searchQuery} onChange={setSearchQuery} />
                         </div>
                        <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {filteredServices.length > 0 ? filteredServices.map(service => {
                                const isSuggested = suggestedServices.includes(service) && !showAll;
                                return (
                                    <button
                                        key={service}
                                        onClick={() => onSelectService(service)}
                                        className={`w-full text-left p-2 rounded-lg transition-colors dark:text-white ${
                                            isSuggested
                                                ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                                                : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        <p className={isSuggested ? 'font-extrabold' : 'font-bold'}>{service}</p>
                                    </button>
                                )}) : (
                                <p className="text-center text-zinc-500 py-8">No services found.</p>
                            )}
                            
                            {canShowMore && (
                                <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <button onClick={() => setShowAll(true)} className="w-full text-center text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                        Show More
                                    </button>
                                </div>
                            )}

                            {showAll && (
                                 <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-700">
                                    <button onClick={() => setShowAll(false)} className="w-full text-center text-sm font-bold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                                        Show Less
                                    </button>
                                </div>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function TaskCard({ task, onEditTask, onAssignCrew, onAddService, isCollapsed, onToggleCollapse, onChangeStatus, onRemoveCrew }) {
    const statusColors = {
        "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "Pending": "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
        "On Hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const allAssignments = useMemo(() => {
        if (!task.services) return [];

        // For each service type, create rows for assigned members plus one empty row to add another.
        return task.services.flatMap(service => {
            const members = task.assigned?.[service] || [];
            
            const assignedRows = members.map(member => ({
                service,
                member
            }));

            const addRow = {
                service,
                member: null
            };
            
            return [...assignedRows, addRow];
        });
    }, [task.services, task.assigned]);


    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg mb-3 overflow-hidden">
            <div className="w-full flex justify-between items-center p-3">
                <button onClick={onToggleCollapse} className="flex-1 text-left">
                    <h3 className="font-bold text-base dark:text-white">{task.title}</h3>
                </button>
                <div className="flex items-center gap-2 ml-2">
                    <button onClick={onChangeStatus} className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block transition-transform hover:scale-105 ${statusColors[task.status || 'Pending']}`}>{task.status || 'Pending'}</button>
                    <button onClick={onEditTask} className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-black dark:hover:text-white flex-shrink-0">
                        <Edit3 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                     <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 border-t-2 border-zinc-100 dark:border-zinc-800 pt-3">
                             <div className="space-y-3">
                                {task.timeline && task.timeline.trim() !== '' && (
                                     <div className="w-full flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300 p-2 rounded-md bg-zinc-100 dark:bg-zinc-800">
                                        <Calendar size={16} />
                                        <span className="font-semibold">{task.timeline}</span>
                                    </div>
                                )}
                                
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5"><Sparkles size={14}/> Services</h4>
                                        <button onClick={onAddService} className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600" title="Add or Edit Services">
                                            <Plus className="w-4 h-4 text-black dark:text-white" />
                                        </button>
                                    </div>
                                    {allAssignments.length > 0 ? (
                                        <div className="space-y-2">
                                            {allAssignments.map(({ service, member }, index) => (
                                                <div key={`${service}-${member?.id || `add-${index}`}`} className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md min-h-[52px]">
                                                    {/* Left Side: Delete button and Service Name */}
                                                    <div className="flex items-center gap-2 w-2/5">
                                                        {member ? (
                                                            <button 
                                                                onClick={() => onRemoveCrew(task.id, service, member.id)}
                                                                className="p-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-red-500 group transition-colors flex-shrink-0"
                                                                title={`Remove ${member.name}`}
                                                            >
                                                                <X className="w-3 h-3 text-black dark:text-white group-hover:text-white" />
                                                            </button>
                                                        ) : (
                                                           <div className="w-6 h-6 flex-shrink-0"></div> // Placeholder for alignment
                                                        )}
                                                        <span className="font-semibold text-sm dark:text-white truncate">{service}</span>
                                                    </div>

                                                    {/* Right Side: Member or Plus button */}
                                                    <div className="w-3/5 flex justify-end">
                                                        {member ? (
                                                            <div className="flex items-center gap-2 text-right">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-sm dark:text-white truncate">{member.name}</p>
                                                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{member.specialty}</p>
                                                                </div>
                                                                <img src={member.imageUrl || createPlaceholder(100, 100, '000', 'fff', getInitials(member.name))} alt={member.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => onAssignCrew(task, service)}
                                                                className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                                title={`Assign crew to ${service}`}
                                                            >
                                                                <UserPlus className="w-4 h-4 text-black dark:text-white" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center text-xs text-zinc-400 p-3 border-2 border-dashed rounded-md">
                                            No services added yet. Click 'Add / Edit' to start.
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
function AddTaskCard({ onClick }) {
    return (
        <Press onClick={onClick} className="border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-lg p-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-black dark:hover:border-zinc-500 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center h-20">
            <Plus className="w-6 h-6" />
            <span className="ml-2 font-bold">Add New Task</span>
        </Press>
    );
}

function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col p-4"
                    >
                        <h2 className="font-bold text-lg text-center dark:text-white">Confirm Deletion</h2>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center my-2">Are you sure you want to delete this {itemName || 'item'}? This action cannot be undone.</p>
                        <div className="flex gap-2 mt-4">
                             <button onClick={onClose} className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white text-sm font-bold py-2 rounded-lg">Cancel</button>
                             <button onClick={onConfirm} className="flex-1 bg-red-500 text-white text-sm font-bold py-2 rounded-lg">Delete</button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

const TASK_STATUSES = ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"];

function ChangeStatusModal({ isOpen, onClose, onSave, currentStatus }) {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Change Task Status</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-2">
                            {TASK_STATUSES.map(status => (
                                <button
                                    key={status}
                                    onClick={() => onSave(status)}
                                    className={`w-full p-2 rounded-md text-sm font-semibold text-left flex items-center justify-between ${currentStatus === status ? 'bg-black dark:bg-white text-white dark:text-black' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 dark:text-white'}`}
                                >
                                    <span>{status}</span>
                                    {currentStatus === status && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function CustomDatePickerModal({ isOpen, onClose, onSave, initialValue }) {
    const today = new Date();
    const initialDate = useMemo(() => {
        if (!initialValue) return today;
        const date = new Date(initialValue);
        if (!isNaN(date.getTime())) return date;
        return today;
    }, [initialValue]);

    const [year, setYear] = useState(initialDate.getFullYear());
    const [month, setMonth] = useState(initialDate.getMonth()); // 0-11
    const [day, setDay] = useState(initialDate.getDate()); // 1-31

    const years = useMemo(() => Array.from({ length: 201 }, (_, i) => today.getFullYear() - 100 + i), [today]);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'long' })), []);
    const days = useMemo(() => {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }, [year, month]);
    
    useEffect(() => {
        const maxDays = new Date(year, month + 1, 0).getDate();
        if (day > maxDays) {
            setDay(maxDays);
        }
    }, [year, month, day]);
    
    const ScrollPicker = ({ values, selectedValue, onSelect, itemHeight = 36 }) => {
        const containerRef = useRef(null);
        const isScrolling = useRef(null);

        useEffect(() => {
            const container = containerRef.current;
            if (container) {
                const index = values.findIndex(v => v === selectedValue);
                if (index > -1) {
                    // Use setTimeout to ensure the element is rendered and ready.
                    setTimeout(() => container.scrollTop = index * itemHeight, 0);
                }
            }
        }, [selectedValue, values, itemHeight]);

        const handleScroll = () => {
            clearTimeout(isScrolling.current);
            isScrolling.current = setTimeout(() => {
                const container = containerRef.current;
                if (container) {
                    const index = Math.round(container.scrollTop / itemHeight);
                    container.scrollTo({ top: index * itemHeight, behavior: 'smooth' });
                    const newValue = values[index];
                    if(newValue !== undefined) {
                        onSelect(newValue);
                    }
                }
            }, 150);
        };

        return (
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="h-48 overflow-y-scroll no-scrollbar"
            >
                <div style={{ height: `calc(50% - ${itemHeight / 2}px)` }} />
                {values.map((value) => (
                    <div 
                        key={value}
                        className="h-9 flex items-center justify-center text-lg"
                        style={{ height: `${itemHeight}px` }}
                    >
                       {value}
                    </div>
                ))}
                <div style={{ height: `calc(50% - ${itemHeight / 2}px)` }} />
            </div>
        );
    };
    
    const handleSave = () => {
        const selectedDate = new Date(year, month, day);
        const formattedDate = selectedDate.toISOString().split('T')[0];
        onSave(formattedDate);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                         <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select Date</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3">
                             <div className="flex justify-center items-center relative dark:text-white bg-white dark:bg-zinc-900 rounded-lg p-2">
                                <div className="w-1/4">
                                   <ScrollPicker values={days} selectedValue={day} onSelect={(d) => setDay(Number(d))} />
                                </div>
                                <div className="w-1/2">
                                    <ScrollPicker values={months} selectedValue={months[month]} onSelect={(m) => setMonth(months.indexOf(m))} />
                                </div>
                                <div className="w-1/3">
                                    <ScrollPicker values={years} selectedValue={year} onSelect={(y) => setYear(Number(y))} />
                                </div>
                                <div className="absolute inset-y-0 left-0 right-0 h-9 bg-zinc-200/50 dark:bg-zinc-700/50 my-auto rounded-lg pointer-events-none" />
                            </div>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                             <button onClick={handleSave} className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Set Date</button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function CustomDateInput({ value, onChange, placeholder = "Select Date" }) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    
    const handleSave = (date) => {
        onChange(date);
        setIsPickerOpen(false);
    };

    const formattedDate = useMemo(() => {
        if (!value) return null;
        try {
            const date = new Date(value);
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const correctedDate = new Date(date.getTime() + userTimezoneOffset);
            return correctedDate.toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        } catch (e) {
            return value;
        }
    }, [value]);

    return (
        <>
            <button onClick={() => setIsPickerOpen(true)} className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white text-left min-h-[40px]">
                {formattedDate || <span className="text-zinc-400">{placeholder}</span>}
            </button>
            <CustomDatePickerModal
                isOpen={isPickerOpen}
                onClose={() => setIsPickerOpen(false)}
                onSave={handleSave}
                initialValue={value}
            />
        </>
    );
}


function NewTaskModal({ isOpen, onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [showTimeline, setShowTimeline] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showServices, setShowServices] = useState(false);
    const [selectedServices, setSelectedServices] = useState([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const taskSuggestions = useMemo(() => [
        "Development",
        "Pre-production",
        "Production",
        "Post-production",
        "Distribution",
    ], []);

    const filteredSuggestions = useMemo(() => {
        if (!title) {
            return taskSuggestions;
        }
        return taskSuggestions.filter(suggestion =>
            suggestion.toLowerCase().includes(title.toLowerCase())
        );
    }, [title, taskSuggestions]);

    const sortedAndFilteredServices = useMemo(() => {
        const suggestions = TASK_TO_SERVICE_SUGGESTIONS[title];
        
        // If a suggested task title is chosen, show only relevant services.
        // Otherwise, show all services.
        const serviceList = suggestions ? suggestions : ALL_SERVICE_LABELS;

        // Then, filter by the search input.
        return serviceList
            .filter(label => label.toLowerCase().includes(serviceSearch.toLowerCase()));

    }, [title, serviceSearch]);

    useEffect(() => {
        if (!isOpen) {
            // Reset all states when modal closes
            setTitle('');
            setShowTimeline(false);
            setStartDate('');
            setEndDate('');
            setShowServices(false);
            setSelectedServices([]);
            setServiceSearch('');
            setShowSuggestions(false);
        }
    }, [isOpen]);

    const handleCreate = () => {
        let finalTitle = title.trim();

        if (!finalTitle && selectedServices.length > 0) {
            finalTitle = selectedServices.join(' & ');
        } else if (!finalTitle) {
            finalTitle = `New Task #${Date.now() % 1000}`; // Fallback with a unique-ish name
        }

        if (finalTitle) {
            let timeline = '';
            if (startDate && endDate) {
                timeline = `${startDate} - ${endDate}`;
            } else if (startDate) {
                timeline = startDate;
            }
            onCreate({
                title: finalTitle,
                timeline,
                services: selectedServices
            });
        }
    };

    const toggleService = (serviceLabel) => {
        setSelectedServices(prev =>
            prev.includes(serviceLabel)
                ? prev.filter(s => s !== serviceLabel)
                : [...prev, serviceLabel]
        );
    };

    return (
         <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Add New Task</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-3">
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={title} 
                                    onChange={e => setTitle(e.target.value)} 
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} // Delay to allow click
                                    placeholder="Task Title" 
                                    className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                />
                                <AnimatePresence>
                                {showSuggestions && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                    >
                                        <div className="p-1">
                                            {filteredSuggestions.length > 0 ? (
                                                filteredSuggestions.map(suggestion => (
                                                    <button
                                                        key={suggestion}
                                                        onClick={() => {
                                                            setTitle(suggestion);
                                                            setShowSuggestions(false);
                                                        }}
                                                        className="w-full text-left p-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white"
                                                    >
                                                        {suggestion}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="text-center text-sm text-zinc-500 p-2">No suggestions found.</div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                                </AnimatePresence>
                            </div>
                            
                            <div>
                                <button onClick={() => setShowTimeline(prev => !prev)} className="w-full flex items-center justify-between gap-2 p-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 dark:text-white">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        <span>Timeline</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showTimeline ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {showTimeline && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex gap-2 pt-2">
                                                <div className="w-full">
                                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Start Date</label>
                                                    <CustomDateInput value={startDate} onChange={setStartDate} placeholder="Start Date" />
                                                </div>
                                                <div className="w-full">
                                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">End Date</label>
                                                    <CustomDateInput value={endDate} onChange={setEndDate} placeholder="End Date" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            
                            <div>
                                <button onClick={() => setShowServices(prev => !prev)} className="w-full flex items-center justify-between gap-2 p-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 dark:text-white">
                                     <div className="flex items-center gap-2">
                                        <Sparkles size={16} />
                                        <span>Services</span>
                                    </div>
                                    <ChevronDown className={`w-4 h-4 transition-transform ${showServices ? 'rotate-180' : ''}`} />
                                </button>
                                <AnimatePresence>
                                    {showServices && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-2 space-y-2">
                                                <div className="relative">
                                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                                    <input 
                                                        type="text"
                                                        value={serviceSearch}
                                                        onChange={(e) => setServiceSearch(e.target.value)}
                                                        placeholder="Search services..."
                                                        className="w-full pl-8 p-1.5 text-sm bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                                    />
                                                </div>
                                                <div className="max-h-40 overflow-y-auto bg-white dark:bg-zinc-800 p-2 rounded-md border-2 border-zinc-300 dark:border-zinc-700 space-y-1">
                                                    {sortedAndFilteredServices.map(label => {
                                                        const isSelected = selectedServices.includes(label);
                                                        const isSuggested = (TASK_TO_SERVICE_SUGGESTIONS[title] || []).includes(label);
                                                        return (
                                                            <button 
                                                                key={label} 
                                                                onClick={() => toggleService(label)}
                                                                className={`w-full text-left px-2 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${isSuggested && !isSelected ? 'bg-zinc-100 dark:bg-zinc-700' : ''} ${isSelected ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-zinc-100 dark:hover:bg-zinc-700 text-black dark:text-white'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded-sm border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-zinc-400 dark:border-zinc-600'}`}>
                                                                    {isSelected && <Check className="w-3 h-3 text-white dark:text-black" />}
                                                                </div>
                                                                <span>{label}</span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                             <button onClick={handleCreate} className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Create Task</button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function EditTaskModal({ isOpen, onClose, onSave, task, onDelete }) {
    const [title, setTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showTimeline, setShowTimeline] = useState(false);

    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title || '');
            const [start = '', end = ''] = task.timeline?.split(' - ') || [];
            setStartDate(start);
            setEndDate(end);
            setShowTimeline(!!task.timeline);
        } else if (!isOpen) {
            setTitle('');
            setStartDate('');
            setEndDate('');
            setShowTimeline(false);
        }
    }, [isOpen, task]);

    const handleSave = () => {
        let timeline = '';
        if (showTimeline && startDate) {
            if (endDate) {
                timeline = `${startDate} - ${endDate}`;
            } else {
                timeline = startDate;
            }
        }
        onSave({ ...task, title, timeline });
        onClose();
    };

    const handleToggleTimeline = () => {
        const willShow = !showTimeline;
        setShowTimeline(willShow);
        if (!willShow) {
            setStartDate('');
            setEndDate('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                 <button onClick={onDelete} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                                <h2 className="font-bold text-lg">Edit Task</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-3">
                             <div>
                                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1 block">Task Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task Title" className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            </div>
                            <div className="border-t-2 border-zinc-200 dark:border-zinc-800 pt-3">
                                <button onClick={handleToggleTimeline} className="w-full flex items-center justify-between gap-2 p-2 text-sm bg-zinc-200 dark:bg-zinc-800 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 dark:text-white">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        <span>Timeline</span>
                                    </div>
                                    <div className={`w-5 h-5 rounded-sm border-2 flex-shrink-0 flex items-center justify-center transition-colors ${showTimeline ? 'bg-black dark:bg-white border-black dark:border-white' : 'bg-white dark:bg-transparent border-zinc-400 dark:border-zinc-600'}`}>
                                        {showTimeline && <Check className="w-3 h-3 text-white dark:text-black" />}
                                    </div>
                                </button>
                                <AnimatePresence>
                                    {showTimeline && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="flex gap-2 pt-2">
                                                <div className="w-full">
                                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Start Date</label>
                                                    <CustomDateInput value={startDate} onChange={setStartDate} placeholder="Start Date" />
                                                </div>
                                                <div className="w-full">
                                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">End Date</label>
                                                    <CustomDateInput value={endDate} onChange={setEndDate} placeholder="End Date" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <button onClick={handleSave} className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Save Changes</button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AssignCrewModal({ isOpen, onClose, onAssign, task, service }) {
    const [tab, setTab] = useState('fromApp'); // fromApp, manual
    const [selectedCrew, setSelectedCrew] = useState([]);
    const [manualName, setManualName] = useState('');
    const [manualRole, setManualRole] = useState('');

    useEffect(() => {
        if (isOpen) {
            setSelectedCrew([]); // Always start with an empty selection for adding new members
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const toggleCrewSelection = (profile) => {
        setSelectedCrew(prev => 
            prev.some(c => c.id === profile.id) 
            ? prev.filter(c => c.id !== profile.id)
            : [...prev, profile]
        );
    };

    const handleManualAdd = () => {
        if (manualName.trim() && manualRole.trim()) {
            const newMember = {
                id: `manual-${Date.now()}`,
                name: manualName,
                specialty: manualRole,
                imageUrl: null // No image for manual entries
            };
            setSelectedCrew(prev => [...prev, newMember]);
            setManualName('');
            setManualRole('');
        }
    };

    const handleAssign = () => {
        onAssign(selectedCrew);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[80vh]"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                             <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Assign to {service}</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <div className="p-2 bg-zinc-200 dark:bg-zinc-800">
                            <div className="flex gap-2 p-1 rounded-lg bg-zinc-300 dark:bg-zinc-700">
                                <button onClick={() => setTab('fromApp')} className={`flex-1 text-sm font-bold py-1.5 rounded-md ${tab === 'fromApp' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-300'}`}>From App</button>
                                <button onClick={() => setTab('manual')} className={`flex-1 text-sm font-bold py-1.5 rounded-md ${tab === 'manual' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-300'}`}>Add Manually</button>
                            </div>
                        </div>
                        <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                           {tab === 'fromApp' ? (
                               MOCK_PROFILES.map(profile => {
                                   const isSelected = selectedCrew.some(c => c.id === profile.id);
                                   return (
                                       <button key={profile.id} onClick={() => toggleCrewSelection(profile)} className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'}`}>
                                           <img src={profile.imageUrl} className="w-10 h-10 rounded-full"/>
                                           <div>
                                               <p className="font-bold text-left dark:text-white">{profile.name}</p>
                                               <p className="text-xs text-left text-zinc-500 dark:text-zinc-400">{profile.specialty}</p>
                                           </div>
                                       </button>
                                   )
                               })
                           ) : (
                               <div className="space-y-3">
                                    <input type="text" value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Full Name" className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                                    <input type="text" value={manualRole} onChange={e => setManualRole(e.target.value)} placeholder="Role (e.g., Gaffer)" className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                                    <button onClick={handleManualAdd} className="w-full bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white text-sm font-bold py-2 rounded-lg">Add to List</button>
                               </div>
                           )}
                        </main>
                         <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <button onClick={handleAssign} className="w-full bg-black dark:bg-white text-white dark:text-black text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200">Assign {selectedCrew.length} Member(s)</button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function EditProjectHeaderModal({ isOpen, onClose, onSave, project }) {
    const [details, setDetails] = useState({
        title: '',
        type: ''
    });
    const projectTypes = ["Ad", "Film", "Series", "Music Video", "Event", "Documentary", "Short Film"];

    useEffect(() => {
        if (project && isOpen) {
            setDetails({
                title: project.title || '',
                type: project.type || ''
            });
        }
    }, [project, isOpen]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave({ ...project, ...details });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Edit Project Details</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-3">
                            <div>
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">Description</label>
                                <textarea name="description" value={details.description} onChange={handleChange} placeholder="Project Description" className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white h-24 resize-none" />
                            </div>
                            <div className="flex gap-2">
                                <div className="w-full">
                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">Start Date</label>
                                    <CustomDateInput value={details.startDate} onChange={(date) => handleChange({ target: { name: 'startDate', value: date } })} />
                                </div>
                                <div className="w-full">
                                    <label className="text-xs text-zinc-500 dark:text-zinc-400">End Date</label>
                                    <CustomDateInput value={details.endDate} onChange={(date) => handleChange({ target: { name: 'endDate', value: date } })} />
                                </div>
                            </div>
                             <div>
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">Project Type</label>
                                <select 
                                    name="type" 
                                    value={details.type}
                                    onChange={handleChange}
                                    className="w-full p-2 bg-white dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                >
                                    <option value="" disabled>Select a type</option>
                                    {projectTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                            </div>
                            <button onClick={handleSave} className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Save Changes</button>
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}


function ProjectDetailPage({ project, onBack, onUpdateProject, onNavigate }) {
    const [isEditingProjectDetails, setIsEditingProjectDetails] = useState(false);
    const [isEditingProjectHeader, setIsEditingProjectHeader] = useState(false);
    const [isProjectInfoCollapsed, setIsProjectInfoCollapsed] = useState(true);

    // --- Start of logic moved from ProjectsPage ---
    const [taskLists, setTaskLists] = useState([]);
    const [barToDeleteId, setBarToDeleteId] = useState(null);
    const [taskToDeleteId, setTaskToDeleteId] = useState(null);
    const [selectingMemberForBar, setSelectingMemberForBar] = useState(null);
    const [selectingServiceForBar, setSelectingServiceForBar] = useState(null);
    const [pickingDateFor, setPickingDateFor] = useState(null);
    const [activeSearchListId, setActiveSearchListId] = useState(null);
    const [changingStatusForTaskList, setChangingStatusForTaskList] = useState(null);
    const menuRef = useRef(null);
    const handleSelectSuggestion = (listId, suggestion) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return {
                    ...list,
                    searchQuery: suggestion,
                    isNameConfirmed: true,
                    isCollapsed: false,
                };
            }
            return list;
        }));
        setActiveSearchListId(null);
    };
    const myTeam = useMemo(() => [MOCK_PROFILES[0], MOCK_PROFILES[1], MOCK_PROFILES[5]], []);

    const statusColors = {
        "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "Pending": "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
        "On Hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const taskSuggestions = useMemo(() => [
        "Admin Role", "Development", "Pre-production", "Production", "Post-production", "Distribution",
    ], []);

    useEffect(() => {
        if (project && project.tasks) {
            const converted = project.tasks.map(task => {
                const bars = [];
                (task.services || []).forEach(service => {
                    const members = task.assigned?.[service] || [];
                    if (members.length > 0) {
                        members.forEach(member => {
                            bars.push({
                                id: `${task.id}-${service}-${member.id}-${Math.random()}`,
                                selectedMember: member,
                                selectedService: service,
                                isCombined: false,
                            });
                        });
                    }
                    bars.push({
                        id: `${task.id}-${service}-add-${Math.random()}`,
                        selectedMember: null,
                        selectedService: service,
                        isCombined: false,
                    });
                });
    
                const [startDate, endDate] = task.timeline ? task.timeline.split(' - ') : [null, null];
    
                return {
                    id: task.id,
                    searchQuery: task.title,
                    bars: bars.length > 0 ? bars.filter(b => b.selectedMember) : [{ id: Date.now() + Math.random(), selectedMember: null, selectedService: null, isCombined: false }],
                    isMenuOpen: false,
                    showDates: !!task.timeline,
                    startDate,
                    endDate,
                    isCollapsed: true,
                    isNameConfirmed: true,
                    showProgress: true,
                    status: task.status,
                };
            });
            setTaskLists(converted);
        }
    }, [project]);
    
    const handleToggleCombine = (listId, barId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return {
                    ...list,
                    bars: list.bars.map(bar =>
                        bar.id === barId ? { ...bar, isCombined: !bar.isCombined } : bar
                    )
                };
            }
            return list;
        }));
    };

    const handleUpdateTaskListStatus = (newStatus) => {
        if (!changingStatusForTaskList) return;
        setTaskLists(prev => prev.map(list => 
            list.id === changingStatusForTaskList.id ? { ...list, status: newStatus } : list
        ));
        setChangingStatusForTaskList(null);
    };

    const toggleTaskMenu = (listId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, isMenuOpen: !list.isMenuOpen };
            }
            return { ...list, isMenuOpen: false };
        }));
    };

    const toggleShowProgress = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, showProgress: !list.showProgress } : list
        ));
    };

    const toggleTaskCollapse = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, isCollapsed: !list.isCollapsed } : list
        ));
    };

    const confirmTaskName = (listId) => {
        setTaskLists(prev => prev.map(list =>
            (list.id === listId && list.searchQuery.trim().length > 0) ? { ...list, isNameConfirmed: true } : list
        ));
    };

    const allowNameEdit = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, isNameConfirmed: false } : list
        ));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const openList = taskLists.find(list => list.isMenuOpen);
            if (openList && menuRef.current && !menuRef.current.contains(event.target)) {
                const toggleButton = document.getElementById(`task-menu-toggle-${openList.id}`);
                if (toggleButton && toggleButton.contains(event.target)) {
                    return;
                }
                setTaskLists(prev => prev.map(list => ({ ...list, isMenuOpen: false })));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [taskLists]);
    
    const handleTaskSearchChange = (listId, query) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, searchQuery: query } : list
        ));
    };

    const handleTaskNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur();
        }
    };

    const addExtraBar = (listId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const lastBar = list.bars[list.bars.length - 1];
                if (lastBar && !lastBar.selectedMember && !lastBar.selectedService) {
                    return list;
                }
                const newBar = { id: Date.now(), selectedMember: null, selectedService: null, isCombined: false };
                return { ...list, bars: [...list.bars, newBar] };
            }
            return list;
        }));
    };

    const handleSelectTeamMember = (member) => {
        const { listId, barId } = selectingMemberForBar;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const newBars = list.bars.map(bar =>
                    bar.id === barId ? { ...bar, selectedMember: member } : bar
                );
                return { ...list, bars: newBars };
            }
            return list;
        }));
        setSelectingMemberForBar(null);
    };

    const handleSelectService = (service) => {
        const { listId, barId } = selectingServiceForBar;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const newBars = list.bars.map(bar =>
                    bar.id === barId ? { ...bar, selectedService: service } : bar
                );
                return { ...list, bars: newBars };
            }
            return list;
        }));
        setSelectingServiceForBar(null);
    };

    const handleRemoveBar = (listId, barId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId && list.bars.length > 1) {
                return { ...list, bars: list.bars.filter(bar => bar.id !== barId) };
            }
            return list;
        }));
    };
    
    const confirmRemoveBar = () => {
        if (barToDeleteId) {
            handleRemoveBar(barToDeleteId.listId, barToDeleteId.barId);
            setBarToDeleteId(null);
        }
    };

    const handleRemoveTaskList = () => {
        if (!taskToDeleteId) return;
        setTaskLists(prev => prev.filter(list => list.id !== taskToDeleteId));
        setTaskToDeleteId(null);
    };

    const toggleShowDates = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, showDates: !list.showDates } : list
        ));
    };

    const handleDateSelect = (date) => {
        if (!pickingDateFor) return;
        const { listId, dateType } = pickingDateFor;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, [dateType]: date };
            }
            return list;
        }));
        setPickingDateFor(null);
    };

    const handleAddNewTaskList = (sourceListId) => {
        const sourceList = taskLists.find(list => list.id === sourceListId);
        if (!sourceList) return;

        const isSourceListEmpty = sourceList.bars.every(
            bar => !bar.selectedMember && !bar.selectedService
        );
        
        if (isSourceListEmpty && !sourceList.searchQuery) {
            return;
        }

        const newList = {
            id: Date.now(),
            searchQuery: '',
            bars: [{ id: Date.now() + Math.random(), selectedMember: null, selectedService: null }],
            isMenuOpen: false,
            showDates: false,
            startDate: null,
            endDate: null,
            isCollapsed: true,
            isNameConfirmed: false,
            status: 'Pending',
            showProgress: false,
        };

        const index = taskLists.findIndex(list => list.id === sourceListId);
        const newTaskLists = [...taskLists];
        newTaskLists.splice(index + 1, 0, newList);
        setTaskLists(newTaskLists);
    };
    // --- End of logic moved from ProjectsPage ---

    if (!project) return null;

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-black flex flex-col">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                <div className="flex items-center justify-center relative gap-2 dark:text-white h-8 w-full">
                    <div className="text-center">
                        <h1 className="font-bold text-lg">{project.title}</h1>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{project.type}</p>
                    </div>
                    <button onClick={() => setIsEditingProjectHeader(true)} className="absolute right-0 p-1 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                        <Edit3 className="w-5 h-5" />
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-3">
                <ProjectInfoCard 
                    project={project} 
                    onEdit={() => setIsEditingProjectDetails(true)}
                    isCollapsed={isProjectInfoCollapsed}
                    onToggleCollapse={() => setIsProjectInfoCollapsed(!isProjectInfoCollapsed)}
                />
                <div className="space-y-3">
                    {taskLists.map(taskList => {
                        const hasValue = taskList.searchQuery && taskList.searchQuery.length > 0;
                        const isNewTaskSuggestion = hasValue && !taskSuggestions.some(s => s.toLowerCase() === taskList.searchQuery.toLowerCase());
                        const completedBars = taskList.bars.filter(bar => bar.selectedMember && bar.selectedService).length;
                        const totalBarsWithService = taskList.bars.filter(bar => bar.selectedService).length;
                        const progress = totalBarsWithService > 0 ? Math.round((completedBars / totalBarsWithService) * 100) : 0;
                        return (
                         <div key={taskList.id} className="bg-zinc-200 dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg p-2 flex flex-col gap-2">
                            <div className="flex justify-between items-center gap-2">
                                <div className="flex-grow flex items-center gap-2">
                                    <div className="relative flex-grow">
                                        <div 
                                            className={`flex items-center gap-2 pr-1 rounded-lg h-9 border-2 transition-all duration-200 ${
                                                hasValue 
                                                ? 'bg-black dark:bg-white border-black dark:border-white shadow-md' 
                                                : 'bg-zinc-100 dark:bg-zinc-800 border-transparent'
                                            } ${!taskList.isNameConfirmed ? 
                                                'focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800 focus-within:border-black dark:focus-within:border-white focus-within:shadow-none' 
                                                : 'cursor-pointer'
                                            }`}
                                            onClick={taskList.isNameConfirmed ? () => toggleTaskCollapse(taskList.id) : undefined}
                                            role={taskList.isNameConfirmed ? "button" : undefined}
                                            tabIndex={taskList.isNameConfirmed ? 0 : -1}
                                            onKeyDown={ (e) => {
                                                if (taskList.isNameConfirmed && (e.key === 'Enter' || e.key === ' ')) {
                                                    e.preventDefault();
                                                    toggleTaskCollapse(taskList.id);
                                                }
                                            }}
                                        >
                                            {taskList.isNameConfirmed ? (
                                                <div className={`flex-1 w-full h-full flex items-center bg-transparent outline-none text-[14px] font-bold px-3 truncate ${hasValue ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                                                    {taskList.searchQuery}
                                                </div>
                                            ) : (
                                                <input
                                                    value={taskList.searchQuery}
                                                    onChange={e => handleTaskSearchChange(taskList.id, e.target.value)}
                                                    onFocus={() => setActiveSearchListId(taskList.id)}
                                                    onBlur={() => {
                                                        setTimeout(() => setActiveSearchListId(null), 150);
                                                        confirmTaskName(taskList.id);
                                                    }}
                                                    onKeyDown={handleTaskNameKeyDown}
                                                    className={`flex-1 w-full h-full bg-transparent outline-none text-[14px] font-bold px-3 transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 ${
                                                        hasValue ? 'text-white dark:text-black' : 'text-black dark:text-white'
                                                    } focus:text-black dark:focus:text-white`}
                                                    placeholder="Create Task"
                                                />
                                            )}
                                            {isNewTaskSuggestion && activeSearchListId === taskList.id && (
                                                <button
                                                    onMouseDown={(e) => { 
                                                        e.preventDefault();
                                                        confirmTaskName(taskList.id);
                                                        setActiveSearchListId(null);
                                                    }}
                                                    className="mr-1.5 p-1 rounded-full bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 transition-colors"
                                                    title="Confirm this new task name"
                                                >
                                                    <Check className="w-4 h-4 text-white dark:text-black" />
                                                </button>
                                            )}
                                            <div className="ml-auto flex items-center gap-2">
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setChangingStatusForTaskList(taskList);
                                                    }} 
                                                    className={`text-xs font-bold px-2 py-1 rounded-full inline-block transition-transform hover:scale-105 whitespace-nowrap flex-shrink-0 ${statusColors[taskList.status || 'Pending']}`}>
                                                    {taskList.status || 'Pending'}
                                                </button>
                                                <div className="flex items-center gap-0.5">
                                                    <div className="relative">
                                                        <button id={`task-menu-toggle-${taskList.id}`} onClick={(e) => { e.stopPropagation(); toggleTaskMenu(taskList.id); }} className={`p-1.5 rounded-full ${hasValue ? 'text-white/70 hover:text-white dark:text-black/70 dark:hover:text-black' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}>
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        <AnimatePresence>
                                                        {taskList.isMenuOpen && (
                                                            <motion.div
                                                                ref={menuRef}
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                transition={{ duration: 0.1 }}
                                                                className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right"
                                                            >
                                                                <div className="p-1">
                                                                    {taskList.isNameConfirmed && (
                                                                        <button onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            allowNameEdit(taskList.id);
                                                                            toggleTaskMenu(taskList.id);
                                                                        }}
                                                                            className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                        >
                                                                            <Edit3 className="w-4 h-4" />
                                                                            <span>Edit Name</span>
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleShowProgress(taskList.id);
                                                                            toggleTaskMenu(taskList.id);
                                                                        }}
                                                                        className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                    >
                                                                        <Activity className="w-4 h-4" />
                                                                        <span>{taskList.showProgress ? 'Hide' : 'Show'} Progress</span>
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            toggleShowDates(taskList.id);
                                                                            toggleTaskMenu(taskList.id);
                                                                        }} 
                                                                        className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                    >
                                                                        <Calendar className="w-4 h-4" />
                                                                        <span>Set Date</span>
                                                                    </button>
                                                                    <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                                                                    <button onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setTaskToDeleteId(taskList.id);
                                                                        toggleTaskMenu(taskList.id);
                                                                    }}
                                                                        className="w-full text-left flex items-center gap-2 p-2 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                        <span>Remove</span>
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                        </AnimatePresence>
                                                    </div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleAddNewTaskList(taskList.id); }} className={`p-1.5 rounded-full ${hasValue ? 'text-white/70 hover:text-white dark:text-black/70 dark:hover:text-black' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}>
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <AnimatePresence>
                                        {activeSearchListId === taskList.id && !taskList.isNameConfirmed && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
                                            >
                                                <div className="p-1">
                                                    {taskSuggestions
                                                        .map(suggestion => (
                                                        <button
                                                            key={suggestion}
                                                            onClick={() => handleSelectSuggestion(taskList.id, suggestion)}
                                                            className="w-full text-left p-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <AnimatePresence>
                                {hasValue && !taskList.isCollapsed && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="pt-2 flex flex-col gap-2 overflow-hidden"
                                    >
                                        {taskList.showDates && (
                                            <div className="flex gap-2 p-1">
                                                <button onClick={() => setPickingDateFor({ listId: taskList.id, dateType: 'startDate' })} className="w-full text-xs text-left p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                                                    <span className="font-bold text-zinc-500 dark:text-zinc-400">Start</span>
                                                    <span className="block font-semibold dark:text-white">{taskList.startDate ? new Date(taskList.startDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                                </button>
                                                <button onClick={() => setPickingDateFor({ listId: taskList.id, dateType: 'endDate' })} className="w-full text-xs text-left p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                                                    <span className="font-bold text-zinc-500 dark:text-zinc-400">End</span>
                                                    <span className="block font-semibold dark:text-white">{taskList.endDate ? new Date(taskList.endDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                                </button>
                                            </div>
                                        )}
                                        {taskList.bars.map((bar) => {
                                            const isFilled = bar.selectedService && bar.selectedMember;
                                            const isCombined = isFilled && bar.isCombined;

                                            return (
                                                <div key={bar.id} className="relative w-full overflow-hidden rounded-lg">
                                                    <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end">
                                                        <button
                                                            onClick={() => setBarToDeleteId({ listId: taskList.id, barId: bar.id })}
                                                            className="w-20 h-full flex items-center justify-center"
                                                            aria-label="Delete bar"
                                                        >
                                                            <Trash2 className="w-6 h-6 text-white" />
                                                        </button>
                                                    </div>
                                                    <motion.div
                                                        className="relative w-full bg-zinc-200 dark:bg-zinc-700"
                                                        drag="x"
                                                        dragConstraints={{ left: -80, right: 0 }}
                                                        dragElastic={{ left: 0.1, right: 0.5 }}
                                                        dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
                                                    >
                                                        <div className="flex-grow bg-zinc-200 dark:bg-zinc-700 p-1">
                                                            <div className="flex flex-col gap-1">
                                                                {isCombined ? (
                                                                    <button
                                                                        onClick={() => handleToggleCombine(taskList.id, bar.id)}
                                                                        className="flex-1 py-2 px-3 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-start gap-4 overflow-hidden"
                                                                    >
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                                                                            <span className="truncate">{bar.selectedService}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <img src={bar.selectedMember.imageUrl} alt={bar.selectedMember.name} className="w-5 h-5 rounded-full flex-shrink-0" />
                                                                            <span className="truncate">{bar.selectedMember.name}</span>
                                                                        </div>
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        {bar.selectedService ? (
                                                                            <div className="flex-1 py-1 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-between px-3 gap-2 overflow-hidden">
                                                                                <button 
                                                                                    onClick={isFilled ? () => handleToggleCombine(taskList.id, bar.id) : undefined} 
                                                                                    disabled={!isFilled}
                                                                                    className={`flex items-center gap-2 overflow-hidden flex-1 text-left ${isFilled ? 'cursor-pointer' : 'cursor-default'}`}
                                                                                >
                                                                                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                                                                                    <span className="truncate">{bar.selectedService}</span>
                                                                                </button>
                                                                                <button onClick={() => {
                                                                                    const currentTask = taskLists.find(t => t.id === taskList.id);
                                                                                    setSelectingServiceForBar({
                                                                                        listId: taskList.id,
                                                                                        barId: bar.id,
                                                                                        taskName: currentTask ? currentTask.searchQuery : ''
                                                                                    });
                                                                                }} className="p-1 -mr-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0">
                                                                                    <Edit3 className="w-3 h-3 text-zinc-500" />
                                                                                </button>
                                                                            </div>
                                                                        ) : (
                                                                            <button onClick={() => {
                                                                                const currentTask = taskLists.find(t => t.id === taskList.id);
                                                                                setSelectingServiceForBar({
                                                                                    listId: taskList.id,
                                                                                    barId: bar.id,
                                                                                    taskName: currentTask ? currentTask.searchQuery : ''
                                                                                });
                                                                            }} className="flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-bold text-black dark:text-white flex items-center justify-start px-3 gap-2 overflow-hidden">
                                                                                <Briefcase className="w-4 h-4 flex-shrink-0"/>
                                                                                <span>Assign Service</span>
                                                                            </button>
                                                                        )}
                                                                        {bar.selectedService && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                            >
                                                                                {bar.selectedMember ? (
                                                                                    <div className="flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-between px-3 gap-2 overflow-hidden">
                                                                                        <button onClick={() => onNavigate('profile', bar.selectedMember)} className="flex items-center gap-2 overflow-hidden flex-1 text-left">
                                                                                            <img src={bar.selectedMember.imageUrl} alt={bar.selectedMember.name} className="w-5 h-5 rounded-full flex-shrink-0" />
                                                                                            <span className="truncate">{bar.selectedMember.name}</span>
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setSelectingMemberForBar({ listId: taskList.id, barId: bar.id })}
                                                                                            className="p-1 -mr-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                                                                                        >
                                                                                            <Edit3 className="w-3 h-3 text-zinc-500" />
                                                                                        </button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button
                                                                                        onClick={() => setSelectingMemberForBar({ listId: taskList.id, barId: bar.id })}
                                                                                        className="w-full flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-bold text-black dark:text-white flex items-center justify-start px-3 gap-2 overflow-hidden"
                                                                                    >
                                                                                        <UserPlus className="w-4 h-4 flex-shrink-0"/>
                                                                                        <span>Assign Member</span>
                                                                                    </button>
                                                                                )}
                                                                            </motion.div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                </div>
                                            );
                                        })}
                                        <div className="flex justify-center pt-2 border-t-2 border-zinc-100 dark:border-zinc-800">
                                            <button onClick={() => addExtraBar(taskList.id)} className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                                                <Plus className="w-5 h-5 text-black dark:text-white" />
                                            </button>
                                        </div>
                                        {taskList.showProgress && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-1 pt-2 border-t-2 border-zinc-300 dark:border-zinc-700"
                                            >
                                                <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                                                    <span className="font-semibold">Task Progress</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-1.5">
                                                    <motion.div 
                                                        className="bg-black dark:bg-white h-1.5 rounded-full" 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${progress}%` }}
                                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        )
                    })}
                </div>
            </main>
            <EditProjectHeaderModal
                isOpen={isEditingProjectHeader}
                onClose={() => setIsEditingProjectHeader(false)}
                onSave={onUpdateProject}
                project={project}
            />
            <EditProjectDetailsModal
                isOpen={isEditingProjectDetails}
                onClose={() => setIsEditingProjectDetails(false)}
                onSave={onUpdateProject}
                project={project}
            />
            <DeleteConfirmationModal
                isOpen={!!barToDeleteId}
                onClose={() => setBarToDeleteId(null)}
                onConfirm={confirmRemoveBar}
                itemName="this bar"
            />
            <DeleteConfirmationModal
                isOpen={!!taskToDeleteId}
                onClose={() => setTaskToDeleteId(null)}
                onConfirm={handleRemoveTaskList}
                itemName="this task"
            />
            <TeamMemberPopup
                isOpen={!!selectingMemberForBar}
                onClose={() => setSelectingMemberForBar(null)}
                onSelectUser={handleSelectTeamMember}
                myTeam={myTeam}
            />
            <ServiceSelectionPopup
                isOpen={!!selectingServiceForBar}
                onClose={() => setSelectingServiceForBar(null)}
                onSelectService={handleSelectService}
                taskName={selectingServiceForBar ? selectingServiceForBar.taskName : null}
            />
            <CustomDatePickerModal
                isOpen={!!pickingDateFor}
                onClose={() => setPickingDateFor(null)}
                onSave={handleDateSelect}
                initialValue={pickingDateFor ? taskLists.find(l => l.id === pickingDateFor.listId)?.[pickingDateFor.dateType] : null}
            />
             <ChangeStatusModal
                isOpen={!!changingStatusForTaskList}
                onClose={() => setChangingStatusForTaskList(null)}
                onSave={handleUpdateTaskListStatus}
                currentStatus={changingStatusForTaskList?.status}
            />
        </div>
    );
}

function NewProjectPage({ onBack, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleCreate = () => {
        if (title.trim()) {
            onCreate({ title, description, startDate, endDate });
        }
    };

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-black flex flex-col">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                <div className="flex items-center justify-center gap-2 dark:text-white h-8">
                    <h1 className="font-bold text-lg">Create New Project</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 space-y-3">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Project Title" className="w-full p-2 text-lg font-bold outline-none bg-zinc-100 dark:bg-zinc-800 dark:text-white rounded-md" />
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Project Description..." className="w-full p-2 text-sm outline-none bg-zinc-100 dark:bg-zinc-800 dark:text-white rounded-md h-24 resize-none"></textarea>
                     <div className="border-t-2 border-zinc-100 dark:border-zinc-800 pt-3">
                         <h3 className="text-sm font-bold mb-2 dark:text-white">Project Timeline</h3>
                         <div className="flex gap-2">
                            <div className="w-full">
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">Start Date</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            </div>
                            <div className="w-full">
                                <label className="text-xs text-zinc-500 dark:text-zinc-400">End Date</label>
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button onClick={handleCreate} className="w-full bg-black text-white text-sm py-2.5 rounded-md hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 disabled:opacity-50" disabled={!title.trim()}>Create Project</button>
            </footer>
        </div>
    );
}

function CollapsibleTeamSection({ category, members, onProfileSelect, onCompanySelect, myTeam, isOpen, onToggle }) {
    const categoryTitle = SECTIONS.find(s => s.key === category)?.title || category;

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center p-3 text-left"
            >
                <h2 className="font-bold capitalize dark:text-white">{categoryTitle}</h2>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 border-t-2 border-black dark:border-zinc-700">
                            <div className="grid grid-cols-2 gap-4">
                                {members.map(member => {
                                    const isCompany = COMPANY_SERVICES.includes(member.category);
                                    if (isCompany) {
                                        return (
                                            <div key={member.id} className="col-span-2">
                                                <CompanyCard
                                                    company={member}
                                                    onSelect={onCompanySelect}
                                                    onAddToTeam={() => {}}
                                                    myTeam={myTeam}
                                                />
                                            </div>
                                        );
                                    }
                                    return (
                                        <ProfileCard key={member.id} profile={member} onSelect={onProfileSelect} onAddToTeam={() => {}} myTeam={myTeam} isTeamContext={true} />
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function MyTeamPage({ myTeam, onProfileSelect, onCompanySelect, searchQuery, onSearchChange, onBack }) {
    const [openSection, setOpenSection] = useState(null);

    const handleToggleSection = (category) => {
        setOpenSection(prevOpenSection => (prevOpenSection === category ? null : category));
    };

    const filteredTeam = useMemo(() => {
        if (!searchQuery) return myTeam;
        return myTeam.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [searchQuery, myTeam]);

    const groupedTeam = useMemo(() => {
        return filteredTeam.reduce((acc, member) => {
            const category = member.category || 'other';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(member);
            return acc;
        }, {});
    }, [filteredTeam]);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <PageHeader title="My Team" searchQuery={searchQuery} onSearchChange={onSearchChange} onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                {myTeam.length > 0 ? (
                    Object.entries(groupedTeam).map(([category, members]) => (
                        <CollapsibleTeamSection
                            key={category}
                            category={category}
                            members={members}
                            onProfileSelect={onProfileSelect}
                            onCompanySelect={onCompanySelect}
                            myTeam={myTeam}
                            isOpen={openSection === category}
                            onToggle={() => handleToggleSection(category)}
                        />
                    ))
                ) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10 flex flex-col items-center">
                        <UsersIcon className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold text-lg">Your Team is Empty</h2>
                        <p className="text-sm mt-1 max-w-xs">Add members from service pages to build your team.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function InboxPage({ conversations, onConversationSelect, onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <PageHeader title="Inbox" onBack={onBack} />
            <main className="flex-1 overflow-y-auto">
                {conversations.map(convo => (
                    <button key={convo.id} onClick={() => onConversationSelect(convo.user)} className="w-full flex items-center gap-3 p-3 border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="relative">
                            <img src={convo.user.imageUrl} alt={convo.user.name} className="w-12 h-12 rounded-full" />
                            {convo.user.onlineStatus === 'online' && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900"></div>}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold dark:text-white">{convo.user.name}</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{convo.time}</p>
                            </div>
                            <div className="flex justify-between items-start">
                                <p className="text-sm text-zinc-600 dark:text-zinc-300 truncate pr-4">{convo.lastMessage}</p>
                                {convo.unread > 0 && <span className="text-xs font-bold bg-black dark:bg-white text-white dark:text-black rounded-full w-5 h-5 flex items-center justify-center">{convo.unread}</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </main>
        </div>
    )
}

function NotificationsPage({ onBack, projects }) {
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <PageHeader title="Notifications" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3 space-y-3">
                {notifications.map(noti => (
                    <motion.div
                        key={noti.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3"
                    >
                        <div className="flex items-start gap-3">
                            <img src={noti.user.imageUrl} alt={noti.user.name} className="w-10 h-10 rounded-full" />
                            <div className="flex-1">
                                <p className="text-sm dark:text-white">
                                    <span className="font-bold">{noti.user.name}</span> has invited you to join the project <span className="font-bold">"{noti.project.title}"</span>.
                                </p>
                                {noti.status === 'pending' ? (
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => setNotifications(current => current.map(n => n.id === noti.id ? { ...n, status: 'accepted' } : n))} className="flex-1 bg-black text-white text-sm py-1.5 rounded-md hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Accept</button>
                                        <button onClick={() => setNotifications(current => current.map(n => n.id === noti.id ? { ...n, status: 'declined' } : n))} className="flex-1 bg-zinc-200 text-black text-sm py-1.5 rounded-md hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600">Decline</button>
                                    </div>
                                ) : (
                                    <p className={`mt-2 text-sm font-bold ${noti.status === 'accepted' ? 'text-green-500' : 'text-red-500'}`}>
                                        Request {noti.status}.
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </main>
        </div>
    );
}

function ChatPage({ profile, onBack }) {
    const [messages, setMessages] = useState(MOCK_MESSAGES);
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() === '') return;
        const newMessage = {
            id: messages.length + 1,
            sender: 'me',
            text: input.trim(),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...messages, newMessage]);
        setInput('');
    };

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-black flex flex-col">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-2">
                <div className="flex items-center gap-2 pl-44 relative"> {/* Adjusted for removed back button */}
                    <img src={profile.imageUrl} alt={profile.name} className="w-10 h-10 rounded-full border-2 border-black dark:border-zinc-700"/>
                    <div className="flex-1">
                        <h2 className="font-bold text-base dark:text-white">{profile.name}</h2>
                        <p className={`text-xs ${profile.onlineStatus === 'online' ? 'text-green-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                            {profile.onlineStatus}
                        </p>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'other' && <img src={profile.imageUrl} className="w-6 h-6 rounded-full" />}
                        <div className={`max-w-[70%] p-2 rounded-lg ${msg.sender === 'me' ? 'bg-black text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 dark:text-white border-2 border-black dark:border-zinc-700 rounded-bl-none'}`}>
                            <p className="text-sm">{msg.text}</p>
                            <p className={`text-xs mt-1 ${msg.sender === 'me' ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-400'} text-right`}>{msg.time}</p>
                        </div>
                    </div>
                ))}
            </main>
            <footer className="p-2 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg outline-none dark:text-white"
                    />
                    <button className="p-2"><Paperclip className="w-5 h-5 text-zinc-600 dark:text-zinc-400" /></button>
                    <button className="p-2"><Mic className="w-5 h-5 text-zinc-600 dark:text-zinc-400" /></button>
                    <button onClick={handleSend} className="p-2 bg-black dark:bg-white rounded-lg">
                        <Send className="w-5 h-5 text-white dark:text-black" />
                    </button>
                </div>
            </footer>
        </div>
    );
}

function AdSlider() {
    const slides = [
        { id: 1, title: "Kickstart your next project", tag: "Promo", bg: "bg-zinc-900" },
        { id: 2, title: "Find top crew near you", tag: "Spotlight", bg: "bg-zinc-800" },
        { id: 3, title: "Academy deals this week", tag: "Deals", bg: "bg-zinc-900" },
    ];
    const [index, setIndex] = useState(0);
    useEffect(() => { const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 3500); return () => clearInterval(t); }, []);
    return (
        <div className="px-3 pt-3">
            <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700 h-24">
                <AnimatePresence initial={false}>
                    <motion.div
                        key={index}
                        className="absolute inset-0 w-full h-full"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', duration: 0.5, ease: 'easeInOut' }}
                    >
                        <div className={`w-full h-full ${slides[index].bg} text-white p-4 text-left`}>
                            <div className="text-[11px] opacity-70 mb-1">{slides[index].tag}</div>
                            <div className="text-lg font-semibold leading-snug">{slides[index].title}</div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="flex items-center justify-center gap-1 mt-2">
                {slides.map((_, i) => (<div key={i} className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-black dark:bg-white" : "w-2 bg-zinc-300 dark:bg-zinc-600"}`} />))}
            </div>
        </div>
    );
}

function RangeSlider({ onApply, filterKey, min, max, initialMin, initialMax, unit = '' }) {
    const [minValue, setMinValue] = useState(initialMin);
    const [maxValue, setMaxValue] = useState(initialMax);

    const handleMinChange = (e) => {
        const value = Math.min(Number(e.target.value), maxValue - 1);
        setMinValue(value);
    };

    const handleMaxChange = (e) => {
        const value = Math.max(Number(e.target.value), minValue + 1);
        setMaxValue(value);
    };

    const incrementMin = () => setMinValue(v => Math.min(v + 1, maxValue - 1));
    const decrementMin = () => setMinValue(v => Math.max(min, v - 1));
    const incrementMax = () => setMaxValue(v => Math.min(v + 1, max));
    const decrementMax = () => setMaxValue(v => Math.max(v - 1, minValue + 1));

    const minPos = ((minValue - min) / (max - min)) * 100;
    const maxPos = ((maxValue - min) / (max - min)) * 100;

    return (
        <div className="p-4 w-full">
            <div className="relative h-2 my-6">
                <div className="absolute bg-zinc-200 dark:bg-zinc-700 h-0.5 w-full top-1/2 -translate-y-1/2 rounded-full"></div>
                <div className="absolute bg-black dark:bg-white h-0.5 top-1/2 -translate-y-1/2 rounded-full" style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}></div>
                <input type="range" min={min} max={max} value={minValue} onChange={handleMinChange} className="range-slider absolute w-full h-2 top-0 appearance-none bg-transparent pointer-events-auto" style={{ zIndex: minValue > max - 10 ? 5 : 3 }} />
                <input type="range" min={min} max={max} value={maxValue} onChange={handleMaxChange} className="range-slider absolute w-full h-2 top-0 appearance-none bg-transparent pointer-events-auto" style={{ zIndex: 4 }} />
            </div>

            <div className="flex justify-between items-center mt-4">
                <div className="flex items-center gap-1 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg p-1 bg-white dark:bg-zinc-900">
                    <button onClick={decrementMin} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                        <Minus size={16}/>
                    </button>
                    <div className="px-1 text-center w-14 font-bold text-base dark:text-white">{minValue}{unit}</div>
                    <button onClick={incrementMin} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                        <Plus size={16}/>
                    </button>
                </div>

                <div className="text-zinc-400 font-bold">-</div>

                <div className="flex items-center gap-1 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg p-1 bg-white dark:bg-zinc-900">
                    <button onClick={decrementMax} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                        <Minus size={16}/>
                    </button>
                    <div className="px-1 text-center w-14 font-bold text-base dark:text-white">{maxValue}{unit}</div>
                    <button onClick={incrementMax} className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                        <Plus size={16}/>
                    </button>
                </div>
            </div>

            <button onClick={() => onApply({ type: filterKey, value: `${minValue}-${maxValue}${unit}` })} className="w-full mt-6 bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Apply</button>
        </div>
    );
}

function FilterButtons({ filterKeys, onFilterSelect }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const onWheel = (e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
                el.scrollLeft += e.deltaY;
                e.preventDefault();
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    return (
        <div ref={ref} className="flex gap-2 overflow-x-auto no-scrollbar">
            {filterKeys.map(key => {
                const Icon = FILTER_ICONS[key] || Sparkles;
                return (
                    <button
                        key={key}
                        onClick={() => onFilterSelect(key)}
                        className="shrink-0 px-3 py-1.5 text-sm capitalize bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors active:scale-95 dark:text-white"
                    >
                        <Icon className="w-4 h-4" />
                        <span>{key}</span>
                    </button>
                );
            })}
        </div>
    );
}

function FilterModal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    const Icon = FILTER_ICONS[title] || Sparkles;
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end justify-center"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        className="w-full max-w-[390px] bg-white dark:bg-zinc-900 rounded-t-2xl border-t-2 border-black dark:border-zinc-700 shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="p-4 border-b-2 border-black dark:border-zinc-700">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <Icon className="w-5 h-5 dark:text-white" />
                                    <h2 className="font-bold text-lg capitalize dark:text-white">{title}</h2>
                                </div>
                                <button onClick={onClose} className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                    <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                                </button>
                            </div>
                        </header>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {children}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ActiveTags({ tags, onRemoveTag }) {
    if (tags.length === 0) return null;
    return (
        <div className="p-3 flex flex-wrap gap-2 bg-zinc-50 dark:bg-black">
            {tags.map(tag => {
                const Icon = FILTER_ICONS[tag.type] || Sparkles;
                return (
                    <motion.div
                        key={tag.value}
                        layout
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="flex items-center gap-1.5 bg-black dark:bg-white text-white dark:text-black text-xs capitalize pl-2 pr-1 py-1 rounded"
                    >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="font-semibold">{tag.value}</span>
                        <button onClick={() => onRemoveTag(tag)} className="p-0.5 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40 rounded-full">
                            <X className="w-3 h-3" />
                        </button>
                    </motion.div>
                );
            })}
        </div>
    );
}

function ProfileCard({ profile, onSelect, onAddToTeam, myTeam, isTeamContext = false, onAssignToProject }) {
    const [visibleTooltip, setVisibleTooltip] = useState(null); // can be 'team', 'project', or null
    const isAdded = myTeam && myTeam.some(m => m.id === profile.id);

    const showTooltip = (tooltipName) => {
        setVisibleTooltip(tooltipName);
        setTimeout(() => {
            setVisibleTooltip(null);
        }, 3000);
    };

    const handleAddClick = (e) => {
        e.stopPropagation();
        showTooltip('team');
        onAddToTeam(profile);
    };

    const handleAssignClick = (e) => {
        e.stopPropagation();
        showTooltip('project');
        // onAssignToProject(profile);
    };

    return (
        <div onClick={() => onSelect(profile)} className="relative aspect-[2/3] w-full bg-zinc-200 rounded-lg overflow-hidden border-2 border-black dark:border-zinc-700 group active:scale-95 transition-transform duration-200 cursor-pointer">
            <img
                src={profile.imageUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x600/000000/FFFFFF?text=Error'; }}
            />
            {!isTeamContext && (
                 <div className="absolute top-2 right-2 flex flex-col items-end gap-2">
                    <div className="relative flex items-center">
                        <AnimatePresence>
                            {visibleTooltip === 'team' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="mr-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md whitespace-nowrap"
                                >
                                    My Team
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button onClick={handleAddClick} title="Add to My Team" className={`p-1.5 rounded-full backdrop-blur-sm transition-colors duration-200 z-10 ${isAdded ? 'bg-white text-black' : 'bg-black/30 text-white hover:bg-black/60'}`}>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={isAdded ? "check" : "plus"}
                                    initial={{ scale: 0.5, opacity: 0, rotate: -90 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                </motion.div>
                            </AnimatePresence>
                        </button>
                    </div>
                     <div className="relative flex items-center">
                        <AnimatePresence>
                            {visibleTooltip === 'project' && (
                                <motion.div
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className="mr-2 px-2 py-1 bg-black/70 text-white text-xs rounded-md whitespace-nowrap"
                                >
                                    Add to Project
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <button onClick={handleAssignClick} title="Add to Crew" className="p-1.5 rounded-full bg-black/30 text-white hover:bg-black/60 backdrop-blur-sm transition-colors duration-200 z-10">
                            <Briefcase className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center gap-1.5">
                    {profile.onlineStatus === 'online' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                    <h3 className="font-bold text-sm text-white">{profile.name}</h3>
                </div>
                <p className="text-xs text-white/90">{profile.specialty}</p>
            </div>
        </div>
    );
}

function ProfileGrid({ profiles, onProfileSelect, onAddToTeam, myTeam, onAssignToProject }) {
    return (
        <div className="p-3 grid grid-cols-2 gap-4">
            {profiles.map(profile => (
                <ProfileCard key={profile.id} profile={profile} onSelect={onProfileSelect} onAddToTeam={onAddToTeam} myTeam={myTeam} onAssignToProject={onAssignToProject} />
            ))}
        </div>
    );
}

function ProfileHeaderCard({ profile, onAssignToProject, onAddToTeam, myTeam, onStartChat, showChatButton = true }) {
    const GenderIcon = profile.about.gender === 'Male' ? Mars : Venus;
    const isAdded = myTeam && myTeam.some(m => m.id === profile.id);
    return (
        <div className="relative aspect-[2/3] w-full bg-zinc-200 rounded-lg overflow-hidden border-2 border-black dark:border-zinc-700">
            <img
                src={profile.imageUrl}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/400x600/000000/FFFFFF?text=Error'; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-between p-3">
                <div className="flex flex-col items-end gap-2">
                    {showChatButton && (
                        <button onClick={() => onStartChat(profile)} className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40 flex items-center gap-1.5 text-sm">
                            <MessageCircleIcon className="w-5 h-5" />
                            <span>Chat</span>
                        </button>
                    )}
                    <button onClick={() => {}} className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/40">
                        <Calendar className="w-5 h-5" />
                    </button>
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-white">{profile.name}</h2>
                        <GenderIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        {profile.onlineStatus === 'online' ? (
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        ) : null}
                        <p className="text-sm text-white/90">{profile.onlineStatus === 'online' ? 'Online' : profile.onlineStatus}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <button onClick={() => onAddToTeam(profile)} className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md transition-colors ${isAdded ? 'bg-white text-black' : 'bg-white/20 text-white backdrop-blur-sm'}`}>
                            {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            <span>My Team</span>
                        </button>
                        <button onClick={() => {}} className="flex-1 bg-white/20 backdrop-blur-sm text-white text-sm py-2 rounded-md hover:bg-white/40">Add to Crew</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CompanyHeaderCard({ company, onAddToTeam, myTeam, onStartChat, onAssignToProject }) {
    const isAdded = myTeam && myTeam.some(m => m.id === company.id);
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
            <div className="flex gap-4">
                <img src={company.imageUrl} alt={company.name} className="w-24 h-24 rounded-full object-cover" />
                <div className="flex-1">
                    <h2 className="text-lg font-bold dark:text-white">{company.name}</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{company.specialty}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1.5"><MapPin size={12} /> {company.location}</p>
                </div>
            </div>
            <div className="flex gap-2 mt-3">
                <button onClick={() => onStartChat(company)} className="flex-1 bg-black/5 dark:bg-white/10 text-black dark:text-white text-sm py-2 rounded-md hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center gap-1.5">
                    <MessageCircleIcon className="w-4 h-4" />
                    <span>Chat</span>
                </button>
                <button onClick={() => onAddToTeam(company)} className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-md transition-colors ${isAdded ? 'bg-black text-white' : 'bg-black/5 dark:bg-white/10 text-black dark:text-white'}`}>
                    {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>My Team</span>
                </button>
                <button onClick={() => {}} className="flex-1 bg-black/5 dark:bg-white/10 text-black dark:text-white text-sm py-2 rounded-md hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center gap-1.5">
                    <Briefcase className="w-4 h-4" />
                    <span>Add to Crew</span>
                </button>
            </div>
        </div>
    );
}

function StatsCard({ stats }) {
    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-2 text-center">
                <p className="font-bold text-lg dark:text-white">{stats.followers}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Followers</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-2 text-center">
                <p className="font-bold text-lg dark:text-white">{stats.projects}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Projects</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-2 text-center">
                <p className="font-bold text-lg dark:text-white">{stats.likes}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Likes</p>
            </div>
        </div>
    );
}

function AboutSection({ about = {}, skills = [], bio, skillsTitle = "Skills" }) {
    const labelMapping = {
        gender: 'Gender',
        age: 'Age',
        nationality: 'Nationality',
        location: 'Location',
        height: 'Height',
        weight: 'Weight',
        skinTone: 'Skin Tone',
        hairColor: 'Hair Color',
    };
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
            <h3 className="font-bold mb-3 dark:text-white">About</h3>
            {bio && <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">{bio}</p>}
            <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(about).filter(([key]) => key !== 'dialects' && key !== 'willingToTravel').map(([key, value]) => (
                    <div key={key} className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{labelMapping[key] || key}</div>
                        <div className="font-semibold dark:text-white">{value}</div>
                    </div>
                ))}
            </div>
             {about.dialects && about.dialects.length > 0 && (
                <>
                    <h3 className="font-bold mt-4 mb-2 dark:text-white">Accent</h3>
                    <div className="flex flex-wrap gap-2">
                        {about.dialects.map(dialect => (
                            <div key={dialect} className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold px-2 py-1 rounded-full dark:text-white">{dialect}</div>
                        ))}
                    </div>
                </>
            )}
            {about.willingToTravel && (
                 <>
                    <h3 className="font-bold mt-4 mb-2 dark:text-white">Availability</h3>
                    <div className="flex flex-wrap gap-2">
                         <div className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold px-2 py-1 rounded-full dark:text-white flex items-center gap-1.5"><Send className="w-3 h-3" /> Willing to Travel</div>
                    </div>
                </>
            )}
            {skills.length > 0 && (
                <>
                    <h3 className="font-bold mt-4 mb-2 dark:text-white">{skillsTitle}</h3>
                    <div className="flex flex-wrap gap-2">
                        {skills.map(skill => (
                            <div key={skill} className="bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold px-2 py-1 rounded-full dark:text-white">{skill}</div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function PostsSection({ posts, isCurrentUser }) {
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg">
            <div className="p-3 border-b-2 border-black dark:border-zinc-700 flex justify-between items-center">
                <h3 className="font-bold dark:text-white">Posts</h3>
                {isCurrentUser && <button className="text-sm font-bold bg-black text-white dark:bg-white dark:text-black px-3 py-1 rounded-md">Add Post</button>}
            </div>
            <div className="p-3 space-y-3">
                {posts.map(post => (
                    <div key={post.id} className="border-b-2 border-zinc-100 dark:border-zinc-800 pb-3 last:border-b-0">
                        <div className="flex items-center gap-2 mb-2">
                            <img src={post.user.imageUrl} alt={post.user.name} className="w-8 h-8 rounded-full" />
                            <div>
                                <p className="font-bold text-sm dark:text-white">{post.user.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{post.timestamp}</p>
                            </div>
                        </div>
                        <p className="text-sm dark:text-zinc-200 mb-2">{post.text}</p>
                        {post.image && <img src={post.image} alt="Post image" className="rounded-lg w-full object-cover" />}
                    </div>
                ))}
            </div>
        </div>
    )
}

function ImageLightbox({ images, startIndex, onClose }) {
    const [currentIndex, setCurrentIndex] = useState(startIndex);

    const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <AnimatePresence mode="wait">
                <motion.img
                    key={currentIndex}
                    src={images[currentIndex].url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
                    onClick={(e) => e.stopPropagation()}
                />
            </AnimatePresence>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
                <X className="w-6 h-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-4 text-white bg-black/50 rounded-full p-2">
                <ChevronLeftIcon className="w-6 h-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-4 text-white bg-black/50 rounded-full p-2">
                <ChevronRightIcon className="w-6 h-6" />
            </button>
        </motion.div>
    );
}

function VideoPlayerModal({ video, onClose }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="w-full max-w-[90vw] bg-black rounded-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                <video src={video.videoUrl} controls autoPlay className="w-full aspect-video"></video>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2">
                <X className="w-6 h-6" />
            </button>
        </motion.div>
    );
}

function AudioPlayerModal({ audio, onClose }) {
    const [isPlaying, setIsPlaying] = useState(true);
    const [volume, setVolume] = useState(1);
    const audioRef = useRef(null);

    const togglePlay = () => setIsPlaying(!isPlaying);

    useEffect(() => {
        if(isPlaying) audioRef.current?.play();
        else audioRef.current?.pause();
    }, [isPlaying]);

    useEffect(() => {
        if(audioRef.current) audioRef.current.volume = volume;
    }, [volume]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <div className="w-full max-w-[300px] bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 p-4" onClick={e => e.stopPropagation()}>
                <audio ref={audioRef} src={audio.audioUrl} onEnded={() => setIsPlaying(false)} autoPlay/>
                <div className="flex items-center gap-4">
                    <img src={audio.url} className="w-16 h-16 rounded-md" />
                    <div className="flex-1">
                        <h4 className="font-bold dark:text-white">{audio.title}</h4>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{audio.artist}</p>
                    </div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                    <button onClick={togglePlay} className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-full">
                        {isPlaying ? <PauseCircle className="w-6 h-6" /> : <PlayCircle className="w-6 h-6" />}
                    </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setVolume(v => Math.max(0, v - 0.1))}>
                        <VolumeX className="w-5 h-5 text-zinc-500" />
                    </button>
                    <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-black dark:accent-white" />
                    <button onClick={() => setVolume(v => Math.min(1, v + 0.1))}>
                        <Volume2 className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

function GalleryCard({ onMediaSelect }) {
    const [tab, setTab] = useState('Albums');
    const [likedItems, setLikedItems] = useState({});
    const tabs = [{ name: 'Albums', icon: FolderClosed }, { name: 'Images', icon: ImageIcon }, { name: 'Videos', icon: Video }, { name: 'Audio', icon: Mic2 }];

    const toggleLike = (type, id) => {
        const key = `${type}-${id}`;
        setLikedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const renderContent = () => {
        switch (tab) {
            case 'Images':
                return (
                    <div className="grid grid-cols-3 gap-2">
                        {MOCK_GALLERY_IMAGES.map((image, index) => (
                            <div key={image.id} className="relative group aspect-square">
                                <motion.div layoutId={`gallery-item-${image.id}`} onClick={() => onMediaSelect({ type: 'image', index, data: image })} className="w-full h-full bg-zinc-200 dark:bg-zinc-800 rounded-md overflow-hidden cursor-pointer">
                                    <img src={image.url} className="w-full h-full object-cover" />
                                </motion.div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleLike('image', image.id); }}
                                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <Heart className={`w-4 h-4 transition-all ${likedItems[`image-${image.id}`] ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            case 'Videos':
                return (
                    <div className="grid grid-cols-3 gap-2">
                        {MOCK_GALLERY_VIDEOS.map((video) => (
                            <div key={video.id} className="relative group aspect-square">
                                <motion.div layoutId={`gallery-item-${video.id}`} onClick={() => onMediaSelect({ type: 'video', data: video })} className="relative w-full h-full bg-zinc-200 dark:bg-zinc-800 rounded-md overflow-hidden cursor-pointer">
                                    <img src={video.url} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/30 grid place-items-center">
                                        <PlayCircle className="w-8 h-8 text-white opacity-70 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </motion.div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleLike('video', video.id); }}
                                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                >
                                    <Heart className={`w-4 h-4 transition-all ${likedItems[`video-${video.id}`] ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            case 'Audio':
                return (
                    <div className="space-y-2">
                        {MOCK_GALLERY_AUDIO.map((audio) => (
                            <div key={audio.id} className="flex items-center gap-3 p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                <button onClick={() => onMediaSelect({ type: 'audio', data: audio })} className="flex-grow flex items-center gap-3 text-left">
                                    <img src={audio.url} className="w-10 h-10 rounded-md" />
                                    <div>
                                        <p className="font-semibold dark:text-white">{audio.title}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{audio.artist}</p>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleLike('audio', audio.id); }}
                                    className="p-2 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                >
                                    <Heart className={`w-4 h-4 transition-all ${likedItems[`audio-${audio.id}`] ? 'text-red-500 fill-red-500' : 'text-zinc-500 dark:text-zinc-400'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                );
            case 'Albums':
            default:
                return (
                    <div className="grid grid-cols-2 gap-3">
                        {MOCK_ALBUMS.map(album => (
                            <button key={album.id} onClick={() => setTab('Images')} className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden relative group cursor-pointer text-left">
                                <img src={album.url} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end">
                                    <h4 className="font-bold text-white">{album.title}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-white/80">
                                        <div className="flex items-center gap-1 text-xs">
                                            <ImageIcon className="w-3 h-3" />
                                            <span>{album.imageCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                            <Video className="w-3 h-3" />
                                            <span>{album.videoCount}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs">
                                            <Mic2 className="w-3 h-3" />
                                            <span>{album.audioCount}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg">
            <div className="p-3 border-b-2 border-black dark:border-zinc-700">
                <h3 className="font-bold dark:text-white">Gallery</h3>
            </div>
            <div className="flex border-b-2 border-black dark:border-zinc-700">
                {tabs.map(t => (
                    <button key={t.name} onClick={() => setTab(t.name)} className={`flex-1 p-2 flex items-center justify-center gap-2 text-sm transition-colors ${tab === t.name ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-white dark:bg-zinc-900 text-black dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                        <t.icon className="w-4 h-4" />
                        {t.name}
                    </button>
                ))}
            </div>
            <div className="p-3">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {renderContent()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

function AwardsCard() {
    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
            <div className="flex items-center gap-2 font-bold mb-3 dark:text-white">
                <Award className="w-5 h-5" />
                <h3>Certificates & Awards</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {MOCK_AWARDS.map(award => {
                    const AwardIcon = award.icon;
                    return (
                        <button
                            key={award.id}
                            className="group flex flex-col items-center justify-center gap-2 text-center bg-black dark:bg-zinc-800 p-3 rounded-lg border-2 border-black dark:border-zinc-700 text-white hover:bg-white dark:hover:bg-zinc-200 hover:text-black dark:hover:text-black transition-colors duration-200 active:scale-95 h-32"
                        >
                            <AwardIcon className="w-8 h-8 text-white group-hover:text-black dark:group-hover:text-black transition-colors duration-200" />
                            <div className="text-center">
                                <p className="text-sm font-bold">{award.title}</p>
                                <p className="text-xs opacity-70 mt-0.5">{award.year}</p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    );
}

function InfoCard({ title, icon: Icon, items, isSocial = false }) {
    const socialIcons = {
        facebook: Facebook,
        twitter: Twitter,
        instagram: Instagram,
        linkedin: Linkedin,
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
            <div className="flex items-center gap-2 font-bold mb-3 dark:text-white">
                <Icon className="w-5 h-5" />
                <h3>{title}</h3>
            </div>
            {isSocial ? (
                <div className="grid grid-cols-2 gap-2">
                    {Object.keys(socialIcons).map(key => {
                        const SocialIcon = socialIcons[key];
                        return (
                            <button key={key} className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                                <SocialIcon className="w-5 h-5 dark:text-white" />
                                <span className="font-semibold text-sm dark:text-white capitalize">{key}</span>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {items.map((item, i) => <p key={i}>{item}</p>)}
                </div>
            )}
        </div>
    );
}

function ProjectCard({ project, onSelect }) {
    return (
        <Press onClick={() => onSelect(project)} className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
            <div className="flex justify-between items-start">
                <h3 className="font-bold dark:text-white">{project.title}</h3>
                <div className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${project.status === 'In Production' ? 'bg-blue-500' : 'bg-zinc-400'}`}>{project.status}</div>
            </div>
            <div className="mt-4">
                <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5">
                    <div className="bg-black dark:bg-white h-1.5 rounded-full" style={{width: `${project.progress}%`}}></div>
                </div>
            </div>
        </Press>
    );
}

function AddProjectCard({ onClick }) {
    return (
        <Press onClick={onClick} className="border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-lg p-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-black dark:hover:border-zinc-500 hover:text-black dark:hover:text-white transition-colors flex flex-col items-center justify-center h-32">
            <Plus className="w-8 h-8" />
            <span className="mt-1 font-bold">Add New Project</span>
        </Press>
    );
}

function AddProjectEasyModeCard({ onClick }) {
    return (
        <Press onClick={onClick} className="border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-lg p-3 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-black dark:hover:border-zinc-500 hover:text-black dark:hover:text-white transition-colors flex flex-col items-center justify-center h-32 text-center">
            <Clapperboard className="w-8 h-8" />
            <span className="mt-1 font-bold">Create Project</span>
        </Press>
    );
}

function AssignMenuPopover({ isOpen, onClose, onSelect }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 p-4 space-y-3"
                    >
                        <h3 className="font-bold text-center dark:text-white">Assign From...</h3>
                        <button onClick={() => onSelect('myTeam')} className="w-full flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-left">
                            <UsersIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-300"/>
                            <div>
                                <p className="font-semibold dark:text-white">My Team</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Select from your saved crew</p>
                            </div>
                        </button>
                        <button onClick={() => onSelect('crew')} className="w-full flex items-center gap-3 p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-left">
                            <Globe className="w-5 h-5 text-zinc-600 dark:text-zinc-300"/>
                            <div>
                                <p className="font-semibold dark:text-white">Crew Profile</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Search all available crew</p>
                            </div>
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function UserSelectionModal({ isOpen, onClose, onSelectUser, source, myTeam }) {
    const [searchQuery, setSearchQuery] = useState('');
    
    const users = useMemo(() => {
        const sourceList = source === 'myTeam' ? myTeam : MOCK_PROFILES;
        if (!searchQuery) return sourceList;
        return sourceList.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [source, myTeam, searchQuery]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative h-full w-full max-w-[390px] mx-auto bg-zinc-100 dark:bg-black flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                             <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Select User</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                         <div className="p-3 border-b-2 border-black dark:border-zinc-700">
                             <SearchBar value={searchQuery} onChange={setSearchQuery} />
                         </div>
                        <main className="flex-1 p-3 space-y-2 overflow-y-auto">
                            {users.length > 0 ? users.map(profile => (
                                <button key={profile.id} onClick={() => onSelectUser(profile)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                    <img src={profile.imageUrl} className="w-10 h-10 rounded-full" alt={profile.name} />
                                    <div>
                                        <p className="font-bold text-left dark:text-white">{profile.name}</p>
                                        <p className="text-xs text-left text-zinc-500 dark:text-zinc-400">{profile.specialty}</p>
                                    </div>
                                </button>
                            )) : (
                                <p className="text-center text-zinc-500 py-8">No users found.</p>
                            )}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function NewProjectEasyModePage({ projects, onBack, onCreate, myTeam, onNavigateToCrewTab, taskLists, setTaskLists, onProfileSelect, onNavigate, dreamProject, onUpdateDreamProject, castMembers }) {
    const [isHeroesExpanded, setIsHeroesExpanded] = useState(false);
    const creatorProfile = MOCK_PROFILES[0]; // Using Aya Mahmoud as the mock creator
    const [heroes, setHeroes] = useState([{ ...creatorProfile, role: 'Creator' }]);
    const [isAssignHeroOpen, setIsAssignHeroOpen] = useState(false);
    const [selectingRoleFor, setSelectingRoleFor] = useState(null);
    const [editingHeroId, setEditingHeroId] = useState(null);
    const editMenuRef = useRef(null);

    useEffect(() => {
        const isTaskListEmpty = (list) => {
            if (!list) return false;
            const hasName = list.searchQuery && list.searchQuery.trim() !== '';
            // An empty list has ONE empty bar and no heroId reference.
            const isDefaultBar = list.bars.length === 1 && !list.bars[0].selectedMember && !list.bars[0].selectedService && !list.bars[0].heroId;
            return !hasName && isDefaultBar;
        };

        const emptyListCount = taskLists.filter(isTaskListEmpty).length;
        const lastList = taskLists.length > 0 ? taskLists[taskLists.length - 1] : null;
        const lastListIsEmpty = lastList && isTaskListEmpty(lastList);
        
        // Scenario 1: Add a placeholder if none exists at the end
        if (taskLists.length === 0 || !lastListIsEmpty) {
            const newList = {
                id: Date.now(),
                searchQuery: '',
                bars: [{ id: Date.now() + Math.random(), selectedMember: null, selectedService: null, isCombined: false }],
                isMenuOpen: false, showDates: false, startDate: null, endDate: null, isCollapsed: true,
                isNameConfirmed: false, showProgress: false, status: 'Pending',
            };
            setTaskLists(prev => [...prev, newList]);
        }
        // Scenario 2: Cleanup extra placeholders to ensure only one exists
        else if (emptyListCount > 1) {
            const nonEmptyLists = taskLists.filter(l => !isTaskListEmpty(l));
            const finalLists = [...nonEmptyLists, lastList]; // Keep the last empty one
            // A simple check to avoid infinite re-renders if the state is already correct
            if (taskLists.length !== finalLists.length) {
                setTaskLists(finalLists);
            }
        }
    }, [taskLists, setTaskLists]);

    const TASK_ICONS = {
        "Development": PenLine,
        "Pre-production": Clapperboard,
        "Production": Film,
        "Post-production": Gem,
        "Distribution": Building,
        "Admin Role": ShieldCheck
    };

    const [isProjectDetailsExpanded, setIsProjectDetailsExpanded] = useState(false);
    const projectTypes = ["Ad", "Film", "Series", "Music Video", "Event", "Documentary", "Short Film"];

    const [editingField, setEditingField] = useState(null);
    const [lockedFields, setLockedFields] = useState({
        projectName: false,
        projectType: false,
        description: false,
        shootingDates: false,
        deliveryDate: false
    });

    const coverPhotoInputRef = useRef(null);

    const handleCoverPhotoUpload = () => {
        coverPhotoInputRef.current.click();
    };

    const handleCoverPhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                onUpdateDreamProject({ ...dreamProject, coverPhoto: event.target.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDeleteCoverPhoto = () => {
        onUpdateDreamProject({ ...dreamProject, coverPhoto: null });
    };

    const handleProjectDetailsChange = (e) => {
        const { name, value } = e.target;
        onUpdateDreamProject({ ...dreamProject, [name]: value });
    };

    const handleConfirmEdit = (fieldName) => {
        setEditingField(null);
        let hasValue = false;
        if (fieldName === 'shootingDates') {
            hasValue = !!dreamProject?.startDate || !!dreamProject?.endDate;
        } else {
            hasValue = !!dreamProject?.[fieldName];
        }

        if (hasValue) {
            setLockedFields(prev => ({ ...prev, [fieldName]: true }));
        }
    };

    const [barToDeleteId, setBarToDeleteId] = useState(null); // { listId, barId }
    const [taskToDeleteId, setTaskToDeleteId] = useState(null); // New state for task deletion
    const [selectingMemberForBar, setSelectingMemberForBar] = useState(null); // { listId, barId }
    const [selectingServiceForBar, setSelectingServiceForBar] = useState(null); // { listId, barId, taskName }
    const [pickingDateFor, setPickingDateFor] = useState(null); // { listId, dateType }
    const [activeSearchListId, setActiveSearchListId] = useState(null); // To show suggestions
    const [changingStatusForTaskList, setChangingStatusForTaskList] = useState(null);
    const menuRef = useRef(null);
    const statusColors = {
        "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "Pending": "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
        "On Hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const handleSelectSuggestion = (listId, suggestion) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return {
                    ...list,
                    searchQuery: suggestion,
                    isNameConfirmed: true,
                    isCollapsed: false, // Open this one
                };
            }
            // And collapse all others
            return { ...list, isCollapsed: true };
        }));
        setActiveSearchListId(null);
    };

    const taskSuggestions = useMemo(() => [
        "Development",
        "Pre-production",
        "Production",
        "Post-production",
        "Distribution",
    ], []);
    
    const handleToggleCombine = (listId, barId) => {
        setTaskLists(prev =>
            prev.map(list => {
                if (list.id === listId) {
                    // Find the bar being toggled to check its current state
                    const barToToggle = list.bars.find(b => b.id === barId);
                    if (!barToToggle) return list;

                    // If we are about to expand this bar (isCombined is currently true)
                    const isExpanding = barToToggle.isCombined;

                    return {
                        ...list,
                        bars: list.bars.map(bar => {
                            // For the clicked bar, just toggle it
                            if (bar.id === barId) {
                                return { ...bar, isCombined: !bar.isCombined };
                            }
                            // If we are expanding, collapse all other bars
                            if (isExpanding) {
                                return { ...bar, isCombined: true };
                            }
                            // Otherwise (if we are collapsing), don't change other bars
                            return bar;
                        }),
                    };
                }
                return list;
            })
        );
    };

    const handleUpdateTaskListStatus = (newStatus) => {
        if (!changingStatusForTaskList) return;
        setTaskLists(prev => prev.map(list => 
            list.id === changingStatusForTaskList.id ? { ...list, status: newStatus } : list
        ));
        setChangingStatusForTaskList(null);
    };

    const toggleTaskMenu = (listId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, isMenuOpen: !list.isMenuOpen };
            }
            return { ...list, isMenuOpen: false }; // Close other menus
        }));
    };

    const toggleShowProgress = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, showProgress: !list.showProgress } : list
        ));
    };

    const toggleTaskCollapse = (listId) => {
        setTaskLists(prev =>
            prev.map(list => {
                if (list.id === listId) {
                    // Toggle the clicked one
                    return { ...list, isCollapsed: !list.isCollapsed };
                }
                // Collapse all others
                return { ...list, isCollapsed: true };
            })
        );
    };

    const confirmTaskName = (listId) => {
        setTaskLists(prev => prev.map(list =>
            (list.id === listId && list.searchQuery.trim().length > 0) ? { ...list, isNameConfirmed: true } : list
        ));
    };

    const allowNameEdit = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, isNameConfirmed: false } : list
        ));
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            const openList = taskLists.find(list => list.isMenuOpen);
            if (openList && menuRef.current && !menuRef.current.contains(event.target)) {
                const toggleButton = document.getElementById(`task-menu-toggle-${openList.id}`);
                if (toggleButton && toggleButton.contains(event.target)) {
                    return;
                }
                setTaskLists(prev => prev.map(list => ({ ...list, isMenuOpen: false })));
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
    };
    }, [taskLists]);
    
    const handleTaskSearchChange = (listId, query) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, searchQuery: query } : list
        ));
    };

    const handleTaskNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.target.blur(); // This will trigger onBlur and hide suggestions
        }
    };

    const addExtraBar = (listId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const lastBar = list.bars[list.bars.length - 1];
                if (lastBar && !lastBar.selectedMember && !lastBar.selectedService) {
                    console.log("Cannot add a new bar while the last one is empty.");
                    return list; // Do not add a new bar if the last one is empty
                }
                const newBar = { id: Date.now(), selectedMember: null, selectedService: null, isCombined: false };
                return { ...list, bars: [...list.bars, newBar] };
            }
            return list;
        }));
    };

    const handleSelectTeamMember = (member) => {
        const { listId, barId } = selectingMemberForBar;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const newBars = list.bars.map(bar =>
                    bar.id === barId ? { ...bar, selectedMember: member, isCombined: true } : bar
                );
                return { ...list, bars: newBars };
            }
            return list;
        }));
        setSelectingMemberForBar(null);
    };

    const handleSelectService = (service) => {
        const { listId, barId } = selectingServiceForBar;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                const newBars = list.bars.map(bar =>
                    bar.id === barId ? { ...bar, selectedService: service } : bar
                );
                return { ...list, bars: newBars };
            }
            return list;
        }));
        setSelectingServiceForBar(null);
    };

    const handleRemoveBar = (listId, barId) => {
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId && list.bars.length > 1) {
                return { ...list, bars: list.bars.filter(bar => bar.id !== barId) };
            }
            return list;
        }));
    };
    
    const confirmRemoveBar = () => {
        if (barToDeleteId) {
            handleRemoveBar(barToDeleteId.listId, barToDeleteId.barId);
            setBarToDeleteId(null);
        }
    };

    const handleRemoveTaskList = () => {
        if (!taskToDeleteId) return;
        setTaskLists(prev => prev.filter(list => list.id !== taskToDeleteId));
        setTaskToDeleteId(null);
    };

    const toggleShowDates = (listId) => {
        setTaskLists(prev => prev.map(list =>
            list.id === listId ? { ...list, showDates: !list.showDates } : list
        ));
    };

    const handleDateSelect = (date) => {
        if (!pickingDateFor) return;
        const { listId, dateType } = pickingDateFor;
        setTaskLists(prev => prev.map(list => {
            if (list.id === listId) {
                return { ...list, [dateType]: date };
            }
            return list;
        }));
        setPickingDateFor(null);
    };

    const handleAddNewTask = (sourceListId) => {
        const sourceList = taskLists.find(list => list.id === sourceListId);
        if (!sourceList) return;

        // A list is considered empty if ALL of its bars have no member and no service selected.
        const isSourceListEmpty = sourceList.bars.every(
            bar => !bar.selectedMember && !bar.selectedService
        ) && !sourceList.searchQuery.trim();
        
        if (isSourceListEmpty) {
            console.log("Cannot add new task from an empty one.");
            return;
        }

        const newList = {
            id: Date.now(),
            searchQuery: '',
            bars: [{ id: Date.now() + Math.random(), selectedMember: null, selectedService: null }],
            isMenuOpen: false,
            showDates: false,
            startDate: null,
            endDate: null,
            isCollapsed: true,
            isNameConfirmed: false,
        };

        const index = taskLists.findIndex(list => list.id === sourceListId);
        const newTaskLists = [...taskLists];
        newTaskLists.splice(index + 1, 0, newList);
        setTaskLists(newTaskLists);
    };

    const handleFocusOnNewTask = (listId) => {
        setActiveSearchListId(listId);

        const listIndex = taskLists.findIndex(l => l.id === listId);
        if (listIndex === -1) return;

        const isLastItem = listIndex === taskLists.length - 1;
        const currentTask = taskLists[listIndex];
        
        const isPlaceholder = !currentTask.isNameConfirmed && currentTask.searchQuery.trim() === '';

        if (isLastItem && isPlaceholder) {
            const newList = {
                id: Date.now(),
                searchQuery: '',
                bars: [{ id: Date.now() + Math.random(), selectedMember: null, selectedService: null, isCombined: false }],
                isMenuOpen: false,
                showDates: false,
                startDate: null,
                endDate: null,
                isCollapsed: true,
                isNameConfirmed: false,
                showProgress: false,
                status: 'Pending',
            };
            setTaskLists(prev => [...prev, newList]);
        }
    };


    useEffect(() => {
        const handleClickOutside = (event) => {
            if (editMenuRef.current && !editMenuRef.current.contains(event.target)) {
                setEditingHeroId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
    };
    }, []);

    const handleAssignHero = (hero) => {
        if (!heroes.some(h => h.id === hero.id)) {
            setHeroes(prev => [...prev, { ...hero, role: null }]);
        }
        setIsAssignHeroOpen(false);
    };

    const handleRemoveHero = (heroId) => {
        // Creator can now be removed based on user request.
        setHeroes(prev => prev.filter(h => h.id !== heroId));
    };

    const handleSelectRole = (role) => {
        if (!selectingRoleFor) return;
        setHeroes(prev => prev.map(h =>
            h.id === selectingRoleFor ? { ...h, role: role } : h
        ));
        setSelectingRoleFor(null);
    };

    return (
        <div className="h-full w-full bg-zinc-100 dark:bg-black flex flex-col">
            <input
                type="file"
                ref={coverPhotoInputRef}
                onChange={handleCoverPhotoChange}
                className="hidden"
                accept="image/*"
            />
            <PageHeader title={dreamProject?.name || "Create Dream Project"} onBack={onBack} />
             <main className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-5 gap-2">
                        {/* Project Details Button */}
                        <Press 
                            onClick={() => setIsProjectDetailsExpanded(!isProjectDetailsExpanded)} 
                            className="h-20 bg-slate-400 dark:bg-slate-500 border-2 border-slate-500 dark:border-slate-600 p-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors flex flex-col items-center justify-center text-center gap-1 rounded-lg"
                        >
                            <FileText size={20} className="text-black dark:text-white" />
                            <h3 className="font-bold text-black dark:text-white text-[10px] leading-tight">Project details</h3>
                        </Press>

                        {/* Admin Rules Button */}
                        <Press
                            onClick={() => setIsHeroesExpanded(!isHeroesExpanded)}
                            className="h-20 bg-amber-400 dark:bg-amber-500 border-2 border-amber-500 dark:border-amber-600 p-2 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors flex flex-col items-center justify-center text-center gap-1 rounded-lg"
                        >
                            <Gavel size={20} className="text-black dark:text-white" />
                            <h3 className="font-bold text-black dark:text-white text-[10px] leading-tight">Admin Rules</h3>
                        </Press>

                        {/* Shooting Table Button */}
                        <Press 
                            onClick={() => onNavigate('shootingTable', dreamProject)}
                            className="h-20 bg-blue-400 dark:bg-blue-500 border-2 border-blue-500 dark:border-blue-600 p-2 hover:bg-blue-300 dark:hover:bg-blue-600 transition-colors flex flex-col items-center justify-center text-center gap-1 rounded-lg"
                        >
                            <Calendar size={20} className="text-black dark:text-white" />
                            <h3 className="font-bold text-black dark:text-white text-[10px] leading-tight">Shooting Table</h3>
                        </Press>

                        {/* Project Budget Button */}
                        <Press 
                            onClick={() => onNavigate('projectBudget', dreamProject)}
                            className="h-20 bg-green-400 dark:bg-green-500 border-2 border-green-500 dark:border-green-600 p-2 hover:bg-green-300 dark:hover:bg-green-600 transition-colors flex flex-col items-center justify-center text-center gap-1 rounded-lg"
                        >
                            <Wallet size={20} className="text-black dark:text-white" />
                            <h3 className="font-bold text-black dark:text-white text-[10px] leading-tight">Project Budget</h3>
                        </Press>

                        {/* New CT Button */}
                        <Press
                            onClick={() => onNavigate('ctPage', dreamProject)}
                            className="h-20 bg-gray-400 dark:bg-gray-500 border-2 border-gray-500 dark:border-gray-600 p-2 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex flex-col items-center justify-center text-center gap-1 rounded-lg"
                        >
                            <Link size={20} className="text-black dark:text-white" />
                            <h3 className="font-bold text-black dark:text-white text-[10px] leading-tight">Cast Selection</h3>
                        </Press>
                    </div>

                    {/* Project Details Collapsible Content */}
                    <AnimatePresence>
                        {isProjectDetailsExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 space-y-3 overflow-hidden"
                            >
                                {/* Project Name */}
                                {lockedFields.projectName ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Project Name</div>
                                            <div className="font-semibold dark:text-white">{dreamProject?.name}</div>
                                        </div>
                                        <button onClick={() => { setLockedFields(prev => ({...prev, projectName: false})); setEditingField('projectName'); }} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                ) : editingField === 'projectName' ? (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Project Name</label>
                                        <input
                                            name="name"
                                            value={dreamProject?.name || ''}
                                            onChange={handleProjectDetailsChange}
                                            onBlur={() => handleConfirmEdit('projectName')}
                                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit('projectName')}
                                            autoFocus
                                            className="w-full mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingField('projectName')} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Project Name</span>
                                    </button>
                                )}

                                {/* Project Type */}
                                {lockedFields.projectType ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Project Type</div>
                                            <div className="font-semibold dark:text-white">{dreamProject?.projectType}</div>
                                        </div>
                                        <button onClick={() => { setLockedFields(prev => ({...prev, projectType: false})); setEditingField('projectType'); }} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                ) : editingField === 'projectType' ? (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Project Type</label>
                                        <select
                                            name="projectType"
                                            value={dreamProject?.projectType || ''}
                                            onChange={handleProjectDetailsChange}
                                            onBlur={() => handleConfirmEdit('projectType')}
                                            autoFocus
                                            className="w-full mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        >
                                            <option value="" disabled>Select a type</option>
                                            {projectTypes.map(type => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingField('projectType')} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Project Type</span>
                                    </button>
                                )}

                                {/* Description */}
                                {lockedFields.description ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Description</div>
                                            <p className="font-semibold dark:text-white whitespace-pre-wrap">{dreamProject?.description}</p>
                                        </div>
                                        <button onClick={() => { setLockedFields(prev => ({...prev, description: false})); setEditingField('description'); }} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white flex-shrink-0 ml-2">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                ) : editingField === 'description' ? (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Description</label>
                                        <textarea
                                            name="description"
                                            value={dreamProject?.description || ''}
                                            onChange={handleProjectDetailsChange}
                                            onBlur={() => handleConfirmEdit('description')}
                                            autoFocus
                                            rows="3"
                                            className="w-full mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white resize-none"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingField('description')} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Description</span>
                                    </button>
                                )}

                                {dreamProject?.coverPhoto ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Poster</div>
                                            <img src={dreamProject?.coverPhoto} alt="Cover" className="mt-2 rounded-md max-h-24 w-auto" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <button onClick={handleCoverPhotoUpload} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white flex-shrink-0">
                                                <Edit3 size={16} />
                                            </button>
                                            <button onClick={handleDeleteCoverPhoto} className="p-1 text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 flex-shrink-0">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={handleCoverPhotoUpload} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Poster</span>
                                    </button>
                                )}

                                {/* Shooting Dates */}
                                {lockedFields.shootingDates ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Shooting Dates</div>
                                            <div className="font-semibold dark:text-white">{`${dreamProject?.startDate || ''} to ${dreamProject?.endDate || ''}`}</div>
                                        </div>
                                        <button onClick={() => { setLockedFields(prev => ({...prev, shootingDates: false})); setEditingField('shootingDates'); }} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                ) : editingField === 'shootingDates' ? (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Shooting Dates</label>
                                        <div className="flex gap-2 mt-1">
                                            <input name="startDate" type="date" value={dreamProject?.startDate || ''} onChange={handleProjectDetailsChange} onBlur={() => handleConfirmEdit('shootingDates')} autoFocus className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                                            <input name="endDate" type="date" value={dreamProject?.endDate || ''} onChange={handleProjectDetailsChange} onBlur={() => handleConfirmEdit('shootingDates')} className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingField('shootingDates')} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Shooting Dates</span>
                                    </button>
                                )}

                                {/* Delivery Date */}
                                {lockedFields.deliveryDate ? (
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 rounded-lg flex justify-between items-center">
                                        <div>
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Delivery Date</div>
                                            <div className="font-semibold dark:text-white">{dreamProject?.deliveryDate}</div>
                                        </div>
                                        <button onClick={() => { setLockedFields(prev => ({...prev, deliveryDate: false})); setEditingField('deliveryDate'); }} className="p-1 text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                                            <Edit3 size={16} />
                                        </button>
                                    </div>
                                ) : editingField === 'deliveryDate' ? (
                                    <div>
                                        <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Delivery Date</label>
                                        <input
                                            name="deliveryDate"
                                            type="date"
                                            value={dreamProject?.deliveryDate || ''}
                                            onChange={handleProjectDetailsChange}
                                            onBlur={() => handleConfirmEdit('deliveryDate')}
                                            autoFocus
                                            className="w-full mt-1 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                        />
                                    </div>
                                ) : (
                                    <button onClick={() => setEditingField('deliveryDate')} className="w-full bg-zinc-100 dark:bg-zinc-800 p-3 text-left hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors rounded-lg shadow-sm">
                                        <span className="font-bold dark:text-white">Delivery Date</span>
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    {/* Admin Rules Collapsible Content */}
                    <AnimatePresence>
                        {isHeroesExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 overflow-hidden"
                            >
                                <div className="flex-grow bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg flex flex-col gap-1">
                                    {heroes.map(hero => (
                                        <div key={hero.id} className="flex-1 py-1 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-between px-3 gap-2">
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 text-left">
                                                <img
                                                    src={hero.imageUrl}
                                                    alt={hero.name}
                                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                                />
                                                <span className="truncate">{hero.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setSelectingRoleFor(hero.id)} className={`text-xs font-bold px-2 py-0.5 rounded-full ${hero.id === creatorProfile.id ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'} hover:bg-zinc-300 dark:hover:bg-zinc-600`}>
                                                    {hero.role || 'Select Role'}
                                                </button>
                                                <div className="relative">
                                                    <button onClick={() => setEditingHeroId(hero.id === editingHeroId ? null : hero.id)} className="p-1 rounded-full text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-blue-500">
                                                        <Edit3 size={12} />
                                                    </button>
                                                    <AnimatePresence>
                                                        {editingHeroId === hero.id && (
                                                            <motion.div
                                                                ref={editMenuRef}
                                                                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                                                                transition={{ duration: 0.1 }}
                                                                className="absolute right-0 top-full mt-1 w-28 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right"
                                                            >
                                                                <div className="p-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            handleRemoveHero(hero.id);
                                                                            setEditingHeroId(null);
                                                                        }}
                                                                        className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-md text-sm hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                                                                    >
                                                                        <span>Remove</span>
                                                                        <X size={14} />
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => setIsAssignHeroOpen(true)} className="flex-1 py-2 bg-white/50 dark:bg-zinc-800/50 rounded-md border-2 border-dashed border-zinc-400 dark:border-zinc-600 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:bg-white/70 dark:hover:bg-zinc-800/70 hover:border-zinc-500 dark:hover:border-zinc-500 transition-colors">
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        <span className="text-sm font-semibold">Assign Hero</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                        {taskLists.map(taskList => {
                            const hasValue = taskList.searchQuery && taskList.searchQuery.length > 0;
                            const hasAnyServiceSelected = taskList.bars.some(bar => bar.selectedService);
                            const isNewTaskSuggestion = hasValue && !taskSuggestions.some(s => s.toLowerCase() === taskList.searchQuery.toLowerCase());
                            const completedBars = taskList.bars.filter(bar => bar.selectedMember && bar.selectedService).length;
                            const totalBarsWithService = taskList.bars.filter(bar => bar.selectedService).length;
                            const progress = totalBarsWithService > 0 ? Math.round((completedBars / totalBarsWithService) * 100) : 0;
                            const iconKey = taskSuggestions.find(s => s.toLowerCase() === taskList.searchQuery.toLowerCase());
                            const Icon = iconKey ? (TASK_ICONS[iconKey] || BrainCircuit) : BrainCircuit;
                            return (
                                     <div key={taskList.id} className="bg-zinc-200 dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg p-2 flex flex-col gap-2">
                                <div className="flex justify-between items-center gap-2">
                                    <div className="flex-grow flex items-center gap-2">
                                        <div className="relative flex-grow">
                                            <div 
                                                className={`flex items-center gap-2 pr-1 rounded-lg h-9 border-2 transition-all duration-200 ${
                                                    hasValue 
                                                    ? 'bg-black dark:bg-white border-black dark:border-white shadow-md' 
                                                    : 'bg-red-500 dark:bg-red-600 border-transparent'
                                                } ${!taskList.isNameConfirmed ? 
                                                    'focus-within:bg-zinc-100 dark:focus-within:bg-zinc-800 focus-within:border-black dark:focus-within:border-white focus-within:shadow-none' 
                                                    : 'cursor-pointer'
                                                }`}
                                                onClick={taskList.isNameConfirmed ? () => toggleTaskCollapse(taskList.id) : undefined}
                                                role={taskList.isNameConfirmed ? "button" : undefined}
                                                tabIndex={taskList.isNameConfirmed ? 0 : -1}
                                                onKeyDown={ (e) => {
                                                    if (taskList.isNameConfirmed && (e.key === 'Enter' || e.key === ' ')) {
                                                        e.preventDefault();
                                                        toggleTaskCollapse(taskList.id);
                                                    }
                                                }}
                                            >
                                                {taskList.isNameConfirmed ? (
                                                    <div className={`flex-1 w-full h-full flex items-center bg-transparent outline-none text-[14px] font-bold px-3 truncate ${hasValue ? 'text-white dark:text-black' : 'text-black dark:text-white'}`}>
                                                        {hasValue && <Icon className="w-4 h-4 mr-2 flex-shrink-0" />}
                                                        {taskList.searchQuery}
                                                    </div>
                                                ) : (
                                                    <input
                                                        value={taskList.searchQuery}
                                                        onChange={e => handleTaskSearchChange(taskList.id, e.target.value)}
                                                        onFocus={() => setActiveSearchListId(taskList.id)}
                                                        onBlur={() => {
                                                            setTimeout(() => setActiveSearchListId(null), 150);
                                                            confirmTaskName(taskList.id);
                                                        }}
                                                        onKeyDown={handleTaskNameKeyDown}
                                                        className={`flex-1 w-full h-full bg-transparent outline-none text-[14px] font-bold px-3 transition-colors text-center ${
                                                            hasValue 
                                                            ? 'text-white dark:text-black placeholder:text-zinc-500 dark:placeholder:text-zinc-400' 
                                                            : 'text-white placeholder:text-white/80'
                                                        } focus:text-black dark:focus:text-white`}
                                                        placeholder="Create Task"
                                                    />
                                                )}
                                                {isNewTaskSuggestion && activeSearchListId === taskList.id && (
                                                    <button
                                                        onMouseDown={(e) => { 
                                                            e.preventDefault();
                                                            confirmTaskName(taskList.id);
                                                            setActiveSearchListId(null);
                                                        }}
                                                        className="mr-1.5 p-1 rounded-full bg-white/20 hover:bg-white/40 dark:bg-black/20 dark:hover:bg-black/40 transition-colors"
                                                        title="Confirm this new task name"
                                                    >
                                                        <Check className="w-4 h-4 text-white dark:text-black" />
                                                    </button>
                                                )}
                                                <div className="ml-auto flex items-center gap-2">
                                                    {hasValue && (
                                                        <>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setChangingStatusForTaskList(taskList);
                                                                }} 
                                                                className={`text-xs font-bold px-2 py-1 rounded-full inline-block transition-transform hover:scale-105 whitespace-nowrap flex-shrink-0 ${statusColors[taskList.status || 'Pending']}`}>
                                                                {taskList.status || 'Pending'}
                                                            </button>
                                                            <div className="flex items-center gap-0.5">
                                                                <div className="relative">
                                                                    <button id={`task-menu-toggle-${taskList.id}`} onClick={(e) => { e.stopPropagation(); toggleTaskMenu(taskList.id); }} className={`p-1.5 rounded-full ${hasValue ? 'text-white/70 hover:text-white dark:text-black/70 dark:hover:text-black' : 'text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'}`}>
                                                                        <MoreVertical className="w-4 h-4" />
                                                                    </button>
                                                                    <AnimatePresence>
                                                                    {taskList.isMenuOpen && (
                                                                        <motion.div
                                                                            ref={menuRef}
                                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                                            animate={{ opacity: 1, scale: 1 }}
                                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                                            transition={{ duration: 0.1 }}
                                                                            className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg z-10 origin-top-right"
                                                                        >
                                                                            <div className="p-1">
                                                                                {taskList.isNameConfirmed && (
                                                                                    <button onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        allowNameEdit(taskList.id);
                                                                                        toggleTaskMenu(taskList.id);
                                                                                    }}
                                                                                        className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                                    >
                                                                                        <Edit3 className="w-4 h-4" />
                                                                                        <span>Edit Name</span>
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleShowProgress(taskList.id);
                                                                                        toggleTaskMenu(taskList.id);
                                                                                    }}
                                                                                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                                >
                                                                                    <Activity className="w-4 h-4" />
                                                                                    <span>{taskList.showProgress ? 'Hide' : 'Show'} Progress</span>
                                                                                </button>
                                                                                <button 
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        toggleShowDates(taskList.id);
                                                                                        toggleTaskMenu(taskList.id);
                                                                                    }} 
                                                                                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white text-sm"
                                                                                >
                                                                                    <Calendar className="w-4 h-4" />
                                                                                    <span>Set Date</span>
                                                                                </button>
                                                                                <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-700"></div>
                                                                                <button onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (taskLists.length > 1) {
                                                                                        setTaskToDeleteId(taskList.id);
                                                                                        toggleTaskMenu(taskList.id);
                                                                                    }
                                                                                }}
                                                                                    disabled={taskLists.length <= 1}
                                                                                    className={`w-full text-left flex items-center gap-2 p-2 rounded-md text-sm ${
                                                                                        taskLists.length > 1
                                                                                            ? 'hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400'
                                                                                            : 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                                                                                    }`}
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                    <span>Remove</span>
                                                                                </button>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                    </AnimatePresence>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    disabled
                                                                    className={`p-1.5 rounded-full ${hasValue ? 'text-white/70' : 'text-zinc-500 dark:text-zinc-400'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                >
                                                                    <MessageSquare className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <AnimatePresence>
                                            {activeSearchListId === taskList.id && !taskList.isNameConfirmed && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="absolute top-full left-0 right-0 mt-1 z-10 bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-700 rounded-lg shadow-lg"
                                                >
                                                    <div className="p-1">
                                                        {taskSuggestions
                                                            .filter(suggestion => suggestion.toLowerCase().includes(taskList.searchQuery.toLowerCase()))
                                                            .map(suggestion => (
                                                            <button
                                                                key={suggestion}
                                                                onClick={() => handleSelectSuggestion(taskList.id, suggestion)}
                                                                className="w-full text-left p-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 dark:text-white"
                                                            >
                                                                {suggestion}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {hasValue && !taskList.isCollapsed && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="pt-2 flex flex-col gap-2 overflow-hidden"
                                        >
                                            {taskList.showDates && (
                                                <div className="flex gap-2 p-1">
                                                    <button onClick={() => setPickingDateFor({ listId: taskList.id, dateType: 'startDate' })} className="w-full text-xs text-left p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                                                        <span className="font-bold text-zinc-500 dark:text-zinc-400">Start</span>
                                                        <span className="block font-semibold dark:text-white">{taskList.startDate ? new Date(taskList.startDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                                    </button>
                                                    <button onClick={() => setPickingDateFor({ listId: taskList.id, dateType: 'endDate' })} className="w-full text-xs text-left p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
                                                        <span className="font-bold text-zinc-500 dark:text-zinc-400">End</span>
                                                        <span className="block font-semibold dark:text-white">{taskList.endDate ? new Date(taskList.endDate).toLocaleDateString('en-GB') : 'Not set'}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {taskList.bars.map((bar) => {
                                                let member = bar.selectedMember;
                                                let service = bar.selectedService;
                                
                                                // NEW LOGIC: If it's a cast selection task, derive the member from castMembers state
                                                if (taskList.searchQuery === 'Cast Selection' && bar.heroId) {
                                                    const hero = castMembers.find(h => h.id === bar.heroId);
                                                    if (hero) {
                                                        const primaryCandidate = hero.candidates?.find(c => c.id === hero.primaryCandidateId && c.selectionData);
                                                        if (primaryCandidate?.selectionType === 'actor') {
                                                            member = primaryCandidate.selectionData;
                                                        }
                                                        // Update service name to hero name for consistency
                                                        service = hero.name;
                                                    }
                                                }
                                                
                                                const isFilled = service && member;
                                                const isCombined = isFilled && bar.isCombined;

                                                return (
                                                    <div key={bar.id} className="relative w-full overflow-hidden rounded-lg">
                                                        {/* Background delete action */}
                                                        <div className="absolute inset-0 bg-red-500 rounded-lg flex items-center justify-end">
                                                            <button
                                                                onClick={() => setBarToDeleteId({ listId: taskList.id, barId: bar.id })}
                                                                className="w-20 h-full flex items-center justify-center"
                                                                aria-label="Delete bar"
                                                            >
                                                                <Trash2 className="w-6 h-6 text-white" />
                                                            </button>
                                                        </div>

                                                        <motion.div
                                                            className="relative w-full bg-zinc-200 dark:bg-zinc-700"
                                                            drag="x"
                                                            dragConstraints={{ left: -80, right: 0 }}
                                                            dragElastic={{ left: 0.1, right: 0.5 }}
                                                            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
                                                        >
                                                            <div className="flex-grow bg-zinc-200 dark:bg-zinc-700 p-1">
                                                                <div className="flex flex-col gap-1">
                                                                    {isCombined ? (
                                                                        <button
                                                                            onClick={() => handleToggleCombine(taskList.id, bar.id)}
                                                                            className="flex-1 py-2 px-3 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-start gap-4 overflow-hidden"
                                                                        >
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <Briefcase className="w-4 h-4 flex-shrink-0" />
                                                                                <span className="truncate">{service}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 overflow-hidden">
                                                                                <img src={member.imageUrl} alt={member.name} className="w-5 h-5 rounded-full flex-shrink-0" />
                                                                                <span className="truncate">{member.name}</span>
                                                                            </div>
                                                                        </button>
                                                                    ) : (
                                                                        <>
                                                                            {service ? (
                                                                                <div className="flex-1 py-1 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-between px-3 gap-2 overflow-hidden">
                                                                                    <button
                                                                                        onClick={isFilled ? () => handleToggleCombine(taskList.id, bar.id) : undefined}
                                                                                        disabled={!isFilled}
                                                                                        className={`flex items-center gap-2 overflow-hidden flex-1 text-left ${isFilled ? 'cursor-pointer' : 'cursor-default'}`}
                                                                                    >
                                                                                        <Briefcase className="w-4 h-4 flex-shrink-0" />
                                                                                        <span className="truncate">{service}</span>
                                                                                    </button>
                                                                                    <button onClick={() => {
                                                                                        if (taskList.searchQuery === 'Cast Selection') {
                                                                                            return; // Disabled
                                                                                        }
                                                                                        const currentTask = taskLists.find(t => t.id === taskList.id);
                                                                                        setSelectingServiceForBar({
                                                                                            listId: taskList.id,
                                                                                            barId: bar.id,
                                                                                            taskName: currentTask ? currentTask.searchQuery : ''
                                                                                        });
                                                                                    }} className="p-1 -mr-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                                                                                       disabled={taskList.searchQuery === 'Cast Selection'}
                                                                                    >
                                                                                        <Edit3 className="w-3 h-3 text-zinc-500" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button onClick={() => {
                                                                                    const currentTask = taskLists.find(t => t.id === taskList.id);
                                                                                    setSelectingServiceForBar({
                                                                                        listId: taskList.id,
                                                                                        barId: bar.id,
                                                                                        taskName: currentTask ? currentTask.searchQuery : ''
                                                                                    });
                                                                                }} className="flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-bold text-black dark:text-white flex items-center justify-start px-3 gap-2 overflow-hidden">
                                                                                    <Briefcase className="w-4 h-4 flex-shrink-0"/>
                                                                                    <span>Assign Service</span>
                                                                                </button>
                                                                            )}
                                                                            {service && (
                                                                                <motion.div
                                                                                    initial={{ opacity: 0, height: 0 }}
                                                                                    animate={{ opacity: 1, height: 'auto' }}
                                                                                    exit={{ opacity: 0, height: 0 }}
                                                                                    transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                                >
                                                                                    {member ? (
                                                                                        <div className="flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md font-bold text-black dark:text-white flex items-center justify-between px-3 gap-2 overflow-hidden">
                                                                                            <button onClick={() => onProfileSelect(member)} className="flex items-center gap-2 overflow-hidden flex-1 text-left">
                                                                                                <img src={member.imageUrl} alt={member.name} className="w-5 h-5 rounded-full flex-shrink-0" />
                                                                                                <span className="truncate">{member.name}</span>
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    if (taskList.searchQuery === 'Cast Selection') {
                                                                                                        const hero = castMembers.find(h => h.id === bar.heroId);
                                                                                                        if (hero) onNavigate('heroDetail', { hero, project: dreamProject });
                                                                                                        return;
                                                                                                    }
                                                                                                    setSelectingMemberForBar({ listId: taskList.id, barId: bar.id })
                                                                                                }}
                                                                                                className="p-1 -mr-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
                                                                                            >
                                                                                                <Edit3 className="w-3 h-3 text-zinc-500" />
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => setSelectingMemberForBar({ listId: taskList.id, barId: bar.id })}
                                                                                            className="w-full flex-1 py-2 bg-white dark:bg-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-bold text-black dark:text-white flex items-center justify-start px-3 gap-2 overflow-hidden"
                                                                                        >
                                                                                            <UserPlus className="w-4 h-4 flex-shrink-0"/>
                                                                                            <span>Assign Member</span>
                                                                                        </button>
                                                                                    )}
                                                                                </motion.div>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    </div>
                                                );
                                            })}
                                            <div className="flex justify-center pt-2 border-t-2 border-zinc-100 dark:border-zinc-800">
                                                <button onClick={() => addExtraBar(taskList.id)} className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">
                                                    <Plus className="w-5 h-5 text-black dark:text-white" />
                                                </button>
                                            </div>
                                            {taskList.showProgress && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="mt-1 pt-2 border-t-2 border-zinc-300 dark:border-zinc-700"
                                                >
                                                    <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-400 mb-1 px-1">
                                                        <span className="font-semibold">Task Progress</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-full h-1.5">
                                                        <motion.div 
                                                            className="bg-black dark:bg-white h-1.5 rounded-full" 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            transition={{ duration: 0.5, ease: 'easeOut' }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )})}
                </div>
            </main>
            <TeamMemberPopup
                isOpen={isAssignHeroOpen}
                onClose={() => setIsAssignHeroOpen(false)}
                onSelectUser={handleAssignHero}
                myTeam={myTeam}
            />
            <RoleSelectionModal
                isOpen={!!selectingRoleFor}
                onClose={() => setSelectingRoleFor(null)}
                onSelectRole={handleSelectRole}
                currentRole={heroes.find(h => h.id === selectingRoleFor)?.role}
            />
            <DeleteConfirmationModal
                isOpen={!!barToDeleteId}
                onClose={() => setBarToDeleteId(null)}
                onConfirm={confirmRemoveBar}
                itemName="this bar"
            />
            <DeleteConfirmationModal
                isOpen={!!taskToDeleteId}
                onClose={() => setTaskToDeleteId(null)}
                onConfirm={handleRemoveTaskList}
                itemName="this task"
            />
            <TeamMemberPopup
                isOpen={!!selectingMemberForBar}
                onClose={() => setSelectingMemberForBar(null)}
                onSelectUser={handleSelectTeamMember}
                myTeam={myTeam}
            />
            <ServiceSelectionPopup
                isOpen={!!selectingServiceForBar}
                onClose={() => setSelectingServiceForBar(null)}
                onSelectService={handleSelectService}
                taskName={selectingServiceForBar ? selectingServiceForBar.taskName : null}
            />
            <CustomDatePickerModal
                isOpen={!!pickingDateFor}
                onClose={() => setPickingDateFor(null)}
                onSave={handleDateSelect}
                initialValue={pickingDateFor ? taskLists.find(l => l.id === pickingDateFor.listId)?.[pickingDateFor.dateType] : null}
            />
            <ChangeStatusModal
                isOpen={!!changingStatusForTaskList}
                onClose={() => setChangingStatusForTaskList(null)}
                onSave={handleUpdateTaskListStatus}
                currentStatus={changingStatusForTaskList?.status}
            />
        </div>
    );
}

function AdvancedFilterModal({ open, onClose, onApply, currentFilters }) {
    const [localFilters, setLocalFilters] = useState(currentFilters);

    useEffect(() => {
        setLocalFilters(currentFilters);
    }, [open, currentFilters]);

    const handleTypeChange = (type) => {
        setLocalFilters(prev => ({ ...prev, type }));
    };

    const handleSortChange = (sort) => {
        setLocalFilters(prev => ({ ...prev, sort }));
    };

    const toggleLocation = (location) => {
        setLocalFilters(prev => {
            const currentLocations = prev.locations || [];
            const newLocations = currentLocations.includes(location)
                ? currentLocations.filter(l => l !== location)
                : [...currentLocations, location];
            return { ...prev, locations: newLocations };
        });
    };
    
    const handleClearLocations = () => {
        setLocalFilters(prev => ({ ...prev, locations: [] }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        const defaultFilters = { type: 'All', locations: [], sort: 'Recommended' };
        setLocalFilters(defaultFilters);
    };

    const popularLocations = ['Cairo', 'Giza', 'Alexandria', 'Dubai', 'Riyadh', 'Beirut'];

    return (
        <AnimatePresence>
            {open && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={handleApply} />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative h-full w-full max-w-[390px] mx-auto bg-zinc-100 dark:bg-black flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Filter & Sort</h2>
                                <button onClick={handleApply} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-3 space-y-4 overflow-y-auto">
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Type</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {['All', 'Individuals', 'Companies'].map(t => (
                                        <button key={t} onClick={() => handleTypeChange(t)} className={`flex-1 text-sm py-2 rounded-md transition-colors ${localFilters.type === t ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>{t}</button>
                                    ))}
                                </div>
                            </div>
                             <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Sort by</h3>
                                <div className="flex gap-2">
                                    {['Recommended', 'Newest', 'Most Followed'].map(s => (
                                        <button key={s} onClick={() => handleSortChange(s)} className={`flex-1 text-sm py-2 rounded-md transition-colors ${localFilters.sort === s ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Shooting location</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {popularLocations.map(loc => {
                                        const isSelected = (localFilters.locations || []).includes(loc);
                                        return (
                                            <button key={loc} onClick={() => toggleLocation(loc)} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                                <span>{loc}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={handleClearLocations} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                            </div>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex gap-3">
                                <button onClick={handleReset} className="flex-1 text-black dark:text-white text-sm py-2.5 rounded-md border-2 border-black dark:border-white hover:bg-zinc-100 dark:hover:bg-zinc-800">Reset</button>
                                <button onClick={handleApply} className="flex-1 bg-black dark:bg-white text-white dark:text-black text-sm py-2.5 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200">Apply Filters</button>
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AddServiceModal({ isOpen, onClose, onAddServices, initialSelected = [] }) {
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (isOpen) {
            const initialServices = SECTIONS.flatMap(s => s.items).filter(item => initialSelected.includes(item.label));
            setSelected(initialServices);
        }
    }, [isOpen, initialSelected]); 

    const toggleService = (service) => {
        setSelected(
            selected.some(s => s.label === service.label)
                ? selected.filter(s => s.label !== service.label)
                : [...selected, service]
        );
    };

    const handleAdd = () => {
        onAddServices(selected);
        setSelected([]);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative h-full w-full max-w-[390px] mx-auto bg-zinc-100 dark:bg-black flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Add Services</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-3 space-y-3 overflow-y-auto">
                            {SECTIONS.map(section => (
                                <div key={section.key} className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg">
                                    <h3 className="font-bold p-3 border-b-2 border-black dark:border-zinc-700 dark:text-white">{section.title}</h3>
                                    <div className="p-3 grid grid-cols-2 gap-2">
                                        {section.items.map(item => {
                                            const isSelected = selected.some(s => s.label === item.label);
                                            const Icon = ITEM_ICONS[item.label] || Film;
                                            return (
                                                <button key={item.label} onClick={() => toggleService(item)} className={`p-2 rounded-md flex items-center gap-2 border-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                                    <Icon className="w-4 h-4" />
                                                    <span>{item.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <button onClick={handleAdd} className="w-full bg-black dark:bg-white text-white dark:text-black text-sm py-2.5 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200">
                                Add {selected.length > 0 ? `${selected.length} Service(s)` : 'Services'}
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function AssignToProjectModal({ isOpen, onClose, onAssign, onAddNewProject, projects }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-sm bg-zinc-100 dark:bg-black rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Assign to Project</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3 space-y-2">
                            <button onClick={onAddNewProject} className="w-full text-left p-2 bg-black/5 dark:bg-white/10 border-2 border-dashed border-zinc-400 dark:border-zinc-600 rounded-md hover:bg-black/10 dark:hover:bg-white/20 flex items-center justify-center gap-2 text-black dark:text-white">
                                <Plus size={16} />
                                <span>New Project</span>
                            </button>
                            {projects.map(project => (
                                <button key={project.id} onClick={() => onAssign(project)} className="w-full text-left p-2 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                    <h3 className="font-bold dark:text-white">{project.title}</h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{project.status}</p>
                                </button>
                            ))}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function SpotlightIcon(props) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="none"
            {...props}
        >
            {/* Larger lamp head */}
            <path d="M3 2 L 9 2 L 8 6 L 4 6 Z" fill="currentColor" />
            {/* Wider light beam */}
            <path d="M4 6 L 8 6 L 22 22 L 2 22 Z" fill="currentColor" opacity="0.3" />
        </svg>
    );
}

function TabBar({ active, onChange }) {
    const items = [
        { key: "home", label: "Crew", icon: SpotlightIcon },
        { key: "projects", label: "Projects", icon: Clapperboard },
        { key: "wall", label: "Agenda", icon: Calendar },
        { key: "spot", label: "Spot", icon: Newspaper },
        { key: "store", label: "Store", icon: Store },
        { key: "star", label: "Star", icon: Star },
    ];
    return (
        <div className="bg-black text-white">
            <div className="grid grid-cols-6">
                {items.map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => onChange(key)} className={`py-3 text-center border-t-2 transition-colors duration-300 ${active === key ? 'text-white border-white' : 'text-white/60 border-transparent'}`}>
                        <div className="grid place-items-center">
                            <Icon className="w-5 h-5" style={{ filter: 'drop-shadow(0 4px 5px rgb(0 0 0 / 0.7))' }} />
                            <div className="text-[11px] mt-0.5">{label}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

function PartnerCard({ partner, onSelect }) {
    return (
        <button onClick={() => onSelect(partner)} className="w-full text-left bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 p-4 flex items-center justify-center">
                <img src={partner.imageUrl} alt={partner.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-3">
                <h3 className="font-bold dark:text-white text-center">{partner.name}</h3>
            </div>
        </button>
    );
}

function StorePage({ searchQuery, onSearchChange, onOpenFilter, onBack, onProductSelect, filter, onFilterChange, selectedType, onSelectType }) {

    const handleCategorySelect = (type) => {
        onSelectType(type);
        onFilterChange(prev => ({ ...prev, types: [type] }));
    };

    const handleBackToCategories = () => {
        onSelectType(null);
        onFilterChange(prev => ({ ...prev, types: ['All'] }));
    };

    const filteredProducts = useMemo(() => {
        const filtered = MOCK_PRODUCTS.filter(product => {
            const currentFilterTypes = filter.types || ['All'];
            const matchesType = currentFilterTypes.includes('All') || currentFilterTypes.includes(product.type);
            const matchesCategory = (filter.categories || []).length === 0 || filter.categories.includes(product.category);
            const matchesBrand = (filter.brands || []).length === 0 || filter.brands.includes(product.brand);
            const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRating = product.rating >= (filter.rating || 0);
            const matchesPrice = product.priceValue >= (filter.priceRange?.min || 0) && product.priceValue <= (filter.priceRange?.max || MAX_PRODUCT_PRICE);
            
            return matchesType && matchesCategory && matchesBrand && matchesSearch && matchesRating && matchesPrice;
        });

        // Now sort
        switch (filter.sort) {
            case 'price-asc':
                return filtered.sort((a, b) => a.priceValue - b.priceValue);
            case 'price-desc':
                return filtered.sort((a, b) => b.priceValue - a.priceValue);
            case 'rating-desc':
                 return filtered.sort((a, b) => b.rating - a.rating);
            case 'recommended':
            default:
                return filtered; 
        }
    }, [searchQuery, filter]);

    const ProductCard = ({ product }) => (
        <button onClick={() => onProductSelect(product)} className="text-left bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden group transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 p-2">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
            </div>
            <div className="p-3">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold dark:text-white pr-2">{product.name}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${product.type === 'New' || product.type === 'Used' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>{product.type}</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">{product.price}</p>
            </div>
        </button>
    );
    
    const storeCategories = [
        { title: 'Trusted Partners', icon: Trophy },
        { title: 'New', icon: Sparkles },
        { title: 'Used', icon: Tag },
        { title: 'Rent', icon: KeyRound },
        { title: 'All', icon: Store }
    ];

    if (!selectedType) {
        return (
            <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
                <PageHeader title="Store" onBack={onBack} />
                <main className="flex-1 overflow-y-auto p-3 space-y-3">
                    {storeCategories.map(({ title, icon: Icon }) => {
                        const isTrusted = title === 'Trusted Partners';
                        return (
                         <button 
                             key={title} 
                             onClick={() => handleCategorySelect(title)} 
                             className={`w-full flex items-center justify-between bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg text-left transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 ${isTrusted ? 'p-6' : 'p-4'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`rounded-md bg-black dark:bg-zinc-800 text-white grid place-items-center ${isTrusted ? 'w-16 h-16' : 'w-12 h-12'}`}>
                                    <Icon className={isTrusted ? 'w-8 h-8' : 'w-6 h-6'} />
                                </div>
                                <h3 className={`font-bold dark:text-white ${isTrusted ? 'text-2xl' : 'text-lg'}`}>{title}</h3>
                            </div>
                        </button>
                        )
                    })}
                </main>
            </div>
        );
    }

    if (selectedType === 'Trusted Partners') {
        return (
            <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
                <PageHeader
                    title="Trusted Partners"
                    onBack={handleBackToCategories}
                    searchQuery={searchQuery}
                    onSearchChange={onSearchChange}
                />
                <main className="flex-1 overflow-y-auto p-3">
                    <div className="grid grid-cols-1 gap-4">
                        {MOCK_TRUSTED_PARTNERS.filter(partner => partner.name.toLowerCase().includes(searchQuery.toLowerCase())).map(partner => (
                            <PartnerCard key={partner.id} partner={partner} onSelect={() => { /* Future navigation */ }} />
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black">
            <PageHeader
                title={`Store - ${selectedType}`}
                onBack={handleBackToCategories}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onOpenFilter={onOpenFilter}
            />
            <main className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </main>
        </div>
    );
}

function StoreAdvancedFilterModal({ isOpen, onClose, onApply, currentFilters }) {
    const [localFilters, setLocalFilters] = useState(currentFilters);
    const [minPrice, setMinPrice] = useState(currentFilters.priceRange?.min || 0);
    const [maxPrice, setMaxPrice] = useState(currentFilters.priceRange?.max || MAX_PRODUCT_PRICE);

    useEffect(() => {
        setLocalFilters(currentFilters);
        setMinPrice(currentFilters.priceRange?.min || 0);
        setMaxPrice(currentFilters.priceRange?.max || MAX_PRODUCT_PRICE);
    }, [isOpen, currentFilters]);

    const priceTimeoutRef = useRef(null);
    useEffect(() => {
        clearTimeout(priceTimeoutRef.current);
        priceTimeoutRef.current = setTimeout(() => {
            setLocalFilters(prev => ({ ...prev, priceRange: { min: minPrice, max: maxPrice }}));
        }, 50);
        return () => clearTimeout(priceTimeoutRef.current);
    }, [minPrice, maxPrice]);

    const handleTypeChange = (type) => {
        setLocalFilters(prev => {
            const currentTypes = prev.types || ['All'];
            let newTypes;

            if (type === 'All') {
                newTypes = ['All'];
            } else {
                let withoutAll = currentTypes.filter(t => t !== 'All');
                if (withoutAll.includes(type)) {
                    newTypes = withoutAll.filter(t => t !== type);
                } else {
                    newTypes = [...withoutAll, type];
                }
            }
            
            if (newTypes.length === 0) {
                newTypes = ['All'];
            }

            return { ...prev, types: newTypes };
        });
    };

    const toggleCategory = (category) => {
        setLocalFilters(prev => {
            const newCategories = prev.categories.includes(category)
                ? prev.categories.filter(c => c !== category)
                : [...prev.categories, category];
            return { ...prev, categories: newCategories };
        });
    };

    const handleClearCategories = () => {
        setLocalFilters(prev => ({ ...prev, categories: [] }));
    };

    const toggleBrand = (brand) => {
        setLocalFilters(prev => {
            const newBrands = (prev.brands || []).includes(brand)
                ? (prev.brands || []).filter(c => c !== brand)
                : [...(prev.brands || []), brand];
            return { ...prev, brands: newBrands };
        });
    };

    const handleClearBrands = () => {
        setLocalFilters(prev => ({ ...prev, brands: [] }));
    };

    const handleSortChange = (sort) => {
        setLocalFilters(prev => ({ ...prev, sort }));
    };

    const handleRatingChange = (rating) => {
        setLocalFilters(prev => ({ ...prev, rating: prev.rating === rating ? 0 : rating }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    const handleReset = () => {
        const defaultFilters = { types: ['All'], categories: [], brands: [], sort: 'recommended', rating: 0, priceRange: { min: 0, max: MAX_PRODUCT_PRICE } };
        setLocalFilters(defaultFilters);
        setMinPrice(0);
        setMaxPrice(MAX_PRODUCT_PRICE);
    };
    
    const minPos = (minPrice / MAX_PRODUCT_PRICE) * 100;
    const maxPos = (maxPrice / MAX_PRODUCT_PRICE) * 100;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={handleApply} />
                    <motion.div
                        initial={{ y: "100%" }} animate={{ y: "0%" }} exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative h-full w-full max-w-[390px] mx-auto bg-zinc-100 dark:bg-black flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Filter Store</h2>
                                <button onClick={handleApply} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-3 space-y-4 overflow-y-auto">
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Sort By</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {
                                        [{key: 'recommended', label: 'Recommended'}, {key: 'rating-desc', label: 'Highest Rated'}, {key: 'price-asc', label: 'Price: Low-High'}, {key: 'price-desc', label: 'Price: High-Low'}].map(s => (
                                            <button key={s.key} onClick={() => handleSortChange(s.key)} className={`flex-1 text-sm py-2 px-1 rounded-md transition-colors ${localFilters.sort === s.key ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>{s.label}</button>
                                        ))
                                    }
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Price Range (EGP)</h3>
                                <div className="relative h-2 my-4">
                                    <div className="absolute bg-zinc-200 dark:bg-zinc-700 h-0.5 w-full top-1/2 -translate-y-1/2 rounded-full"></div>
                                    <div className="absolute bg-black dark:bg-white h-0.5 top-1/2 -translate-y-1/2 rounded-full" style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }}></div>
                                    <input type="range" min="0" max={MAX_PRODUCT_PRICE} value={minPrice} step="100" onChange={(e) => setMinPrice(Math.min(Number(e.target.value), maxPrice - 1))} className="range-slider" />
                                    <input type="range" min="0" max={MAX_PRODUCT_PRICE} value={maxPrice} step="100" onChange={(e) => setMaxPrice(Math.max(Number(e.target.value), minPrice + 1))} className="range-slider" />
                                </div>
                                <div className="flex justify-between items-center mt-4 text-sm dark:text-white">
                                    <span>{minPrice.toLocaleString()}</span>
                                    <span>{maxPrice.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Rating</h3>
                                <div className="flex items-center justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button key={star} onClick={() => handleRatingChange(star)} className="flex items-center gap-1 p-2 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                            <span className={`font-bold text-lg ${localFilters.rating >= star ? 'text-black dark:text-white' : 'text-zinc-400'}`}>{star}</span>
                                            <Star className={`w-6 h-6 transition-colors ${localFilters.rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-300 dark:text-zinc-600'}`} />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-zinc-500 mt-2">and up</p>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Type</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {['All', 'New', 'Used', 'Rent'].map(t => (
                                        <button key={t} onClick={() => handleTypeChange(t)} className={`flex-1 text-sm py-2 rounded-md transition-colors ${localFilters.types.includes(t) ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>{t}</button>
                                    ))}
                                </div>
                                <button onClick={() => handleTypeChange('All')} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Categories</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {STORE_CATEGORIES.map(cat => {
                                        const isSelected = localFilters.categories.includes(cat);
                                        return (
                                            <button key={cat} onClick={() => toggleCategory(cat)} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                                <span>{cat}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={handleClearCategories} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                            </div>
                            <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                                <h3 className="font-bold dark:text-white mb-3">Brand</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {STORE_BRANDS.map(brand => {
                                        const isSelected = (localFilters.brands || []).includes(brand);
                                        return (
                                            <button key={brand} onClick={() => toggleBrand(brand)} className={`p-2 rounded-md flex items-center justify-center gap-2 border-2 text-sm ${isSelected ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                                                <span>{brand}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                                <button onClick={handleClearBrands} className="w-full text-center text-xs font-bold text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white mt-3 py-1">Clear all</button>
                            </div>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                            <div className="flex gap-3">
                                <button onClick={handleReset} className="flex-1 text-black dark:text-white text-sm py-2.5 rounded-md border-2 border-black dark:border-white hover:bg-zinc-100 dark:hover:bg-zinc-800">Reset</button>
                                <button onClick={handleApply} className="flex-1 bg-black dark:bg-white text-white dark:text-black text-sm py-2.5 rounded-md hover:bg-zinc-800 dark:hover:bg-zinc-200">Apply Filters</button>
                            </div>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function StepOnePage({ onBack, onEventSelect, onOpportunitySelect }) {
    const [tab, setTab] = useState('Events');

    const EventCard = ({ event }) => {
        const dateParts = event.date.split(' ');
        const day = dateParts[1].replace(',', '');
        const month = dateParts[0].substring(0,3).toUpperCase();

        return (
            <button onClick={() => onEventSelect(event)} className="w-full flex overflow-hidden rounded-lg border-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900 mb-3 transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="flex-1 bg-black dark:bg-zinc-800 p-3 text-white text-left">
                    <span className="text-xs font-bold bg-white/10 text-white px-2 py-1 rounded-full">{event.type}</span>
                    <h3 className="font-bold mt-2">{event.title}</h3>
                </div>
                <div className="w-24 flex flex-col items-center justify-center p-2 border-l-2 border-black dark:border-zinc-700">
                    <p className="text-3xl font-bold dark:text-white">{day}</p>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{month}</p>
                </div>
            </button>
        );
    };

    const OpportunityCard = ({ opportunity }) => (
        <button onClick={() => onOpportunitySelect(opportunity)} className="w-full text-left bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg overflow-hidden mb-3 transition-all hover:shadow-lg hover:-translate-y-1">
            <div className="p-3">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded-full">{opportunity.type}</span>
                        <h3 className="font-bold mt-2 dark:text-white">{opportunity.title}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-black dark:bg-white text-white dark:text-black grid place-items-center flex-shrink-0">
                        <ArrowRightIcon className="w-5 h-5" />
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t-2 border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-1.5"><Building2 size={14} /> <span>{opportunity.organization}</span></div>
                    <div className="flex items-center gap-1.5"><Clock size={14} /> <span>{opportunity.deadline}</span></div>
                </div>
            </div>
        </button>
    );

    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Step One" onBack={onBack} />
            <div className="p-3">
                <div className="flex gap-2 bg-zinc-200 dark:bg-zinc-800 p-1 rounded-lg">
                    <button onClick={() => setTab('Events')} className={`flex-1 text-sm font-bold py-2 rounded-md transition-colors ${tab === 'Events' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-300'}`}>Events</button>
                    <button onClick={() => setTab('Opportunities')} className={`flex-1 text-sm font-bold py-2 rounded-md transition-colors ${tab === 'Opportunities' ? 'bg-white dark:bg-black text-black dark:text-white' : 'text-zinc-600 dark:text-zinc-300'}`}>Opportunities</button>
                </div>
            </div>
            <main className="flex-1 overflow-y-auto px-3">
                {tab === 'Events' ? (
                    MOCK_EVENTS.map(event => <EventCard key={event.id} event={event} />)
                ) : (
                    MOCK_OPPORTUNITIES.map(opp => <OpportunityCard key={opp.id} opportunity={opp} />)
                )}
            </main>
        </div>
    );
}

function EventDetailPage({ event, onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title={event.type} onBack={onBack} />
            <main className="flex-1 overflow-y-auto">
                <div className="relative h-48 bg-black">
                    <img src={event.image} alt={event.title} className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="p-4 space-y-4">
                    <h1 className="text-2xl font-bold dark:text-white">{event.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5"><Calendar size={16} /> <span>{event.date}</span></div>
                        <div className="flex items-center gap-1.5"><MapPin size={16} /> <span>{event.location}</span></div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                        <h3 className="font-bold mb-2 dark:text-white">About this event</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{event.description}</p>
                    </div>
                </div>
            </main>
            <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    Get Tickets
                </button>
            </footer>
        </div>
    );
}

function OpportunityDetailPage({ opportunity, onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title={opportunity.type} onBack={onBack} />
            <main className="flex-1 overflow-y-auto">
                <div className="relative h-48 bg-black">
                    <img src={opportunity.image} alt={opportunity.title} className="w-full h-full object-cover opacity-80" />
                </div>
                <div className="p-4 space-y-4">
                    <h1 className="text-2xl font-bold dark:text-white">{opportunity.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-300">
                        <div className="flex items-center gap-1.5"><Building2 size={16} /> <span>{opportunity.organization}</span></div>
                        <div className="flex items-center gap-1.5"><Clock size={16} /> <span>Deadline: {opportunity.deadline}</span></div>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                        <h3 className="font-bold mb-2 dark:text-white">Description</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{opportunity.description}</p>
                    </div>
                </div>
            </main>
            <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    Apply Now
                </button>
            </footer>
        </div>
    );
}

function CourseDetailPage({ course, onBack }) {
    const Icon = ITEM_ICONS[course.category] || GraduationCap;
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title={course.title} onBack={onBack} />
            <main className="flex-1 overflow-y-auto">
                <div className="relative aspect-video bg-black">
                    <img src={course.image} alt={course.title} className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
                        <div className="w-12 h-12 rounded-lg grid place-items-center bg-black/50 backdrop-blur-sm text-white border border-white/20">
                            <Icon className="w-6 h-6" />
                        </div>
                    </div>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold dark:text-white">{course.title}</h1>
                        <p className="text-zinc-500 dark:text-zinc-400">{course.category} Workshop</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 flex items-center gap-2">
                            <Calendar size={16} className="text-zinc-500" /> <span className="dark:text-white">{course.date}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 flex items-center gap-2">
                            <Hash size={16} className="text-zinc-500" /> <span className="dark:text-white">{course.sessions} Sessions</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 flex items-center gap-2">
                            <MapPin size={16} className="text-zinc-500" /> <span className="dark:text-white">{course.location}</span>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3 flex items-center gap-2">
                            <Ticket size={16} className="text-zinc-500" /> <span className="dark:text-white">{course.price}</span>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                        <h3 className="font-bold mb-2 dark:text-white">About this course</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            This is a detailed description for the "{course.title}" course. It covers advanced techniques and provides hands-on experience. Suitable for professionals looking to enhance their skills in {course.category}.
                        </p>
                    </div>
                </div>
            </main>
            <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    Book Now
                </button>
            </footer>
        </div>
    );
}

function ProductDetailPage({ product, onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title={product.name} onBack={onBack} />
            <main className="flex-1 overflow-y-auto">
                <div className="aspect-square bg-white dark:bg-zinc-900 p-4">
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                </div>
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold dark:text-white">{product.name}</h1>
                            <p className="text-zinc-500 dark:text-zinc-400">{product.category}</p>
                        </div>
                        <span className={`text-sm font-bold px-3 py-1 rounded-full whitespace-nowrap ${product.type === 'Sale' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}`}>{product.type}</span>
                    </div>
                    <p className="text-3xl font-bold dark:text-white">{product.price}</p>
                    <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg p-3">
                        <h3 className="font-bold mb-2 dark:text-white">Description</h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            Detailed description for the {product.name}. This section would include specifications, features, and other relevant information for potential buyers or renters. High-quality equipment for all your production needs.
                        </p>
                    </div>
                </div>
            </main>
            <footer className="p-3 border-t-2 border-black dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button className="w-full bg-black text-white text-sm font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                    {product.type === 'Sale' ? 'Add to Cart' : 'Rent Now'}
                </button>
            </footer>
        </div>
    );
}

function LogoSplashScreen({ onFinished }) {
    useEffect(() => {
        const timer = setTimeout(onFinished, 2500); // 0.5s fade-in + 2s display
        return () => clearTimeout(timer);
    }, [onFinished]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="h-full w-full flex flex-col items-center justify-center bg-black text-white p-8 text-center"
        >
            <div className="flex flex-col items-center justify-center font-black uppercase text-white text-8xl leading-none">
                 <div className="flex items-center">
                    <div className="w-[68px] h-[68px] bg-white rounded-full -mr-1"></div>
                    <span style={{ letterSpacing: '-0.05em' }}>NE</span>
                 </div>
                 <div className="-mt-6" style={{ letterSpacing: '-0.05em' }}>
                     CREW
                 </div>
            </div>
        </motion.div>
    );
}

function BookingRequestCard({ request, project, onAccept, onDecline, onSuggestEdit, isExpanded, onToggleExpand }) {
    const fromProfile = MOCK_PROFILES.find(p => p.id === request.from.id) || MOCK_COMPANIES.find(c => c.id === request.from.id);
    const isPending = request.status === 'pending';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className={`${isPending ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-800'} border-2 border-zinc-400 dark:border-zinc-700 rounded-lg overflow-hidden transition-colors duration-300`}
        >
            <div
                onClick={onToggleExpand}
                className={`w-full flex items-center justify-between gap-4 text-left transition-all duration-300 cursor-pointer ${isExpanded ? 'p-3' : 'p-1.5'}`}
            >
                <p className={`font-extrabold truncate ${isPending ? 'text-white dark:text-black' : 'text-zinc-500 dark:text-zinc-400'} ${isExpanded ? 'text-lg' : 'text-base'}`}>
                    {request.project}
                </p>
                <button onClick={(e) => e.stopPropagation()} className={`p-1 rounded-full flex-shrink-0 ${isPending ? 'text-white/70 dark:text-black/70' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    <MessageCircleIcon className="w-5 h-5" />
                </button>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        key="content"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 }
                        }}
                        transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="pt-3 px-3 pb-3 border-t-2 border-zinc-100 dark:border-zinc-800">
                            <div className="space-y-3">
                                {project && (
                                    <div className="space-y-2 pb-3 mb-3 border-b-2 border-zinc-100 dark:border-zinc-700">
                                        <h4 className={`text-xs font-bold ${isPending ? 'text-white/70 dark:text-black/70' : 'text-zinc-500 dark:text-zinc-400'}`}>Project Info</h4>
                                        <p className={`text-sm ${isPending ? 'text-white/90 dark:text-black/90' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                            {project.description}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs pt-1">
                                            <span className={`px-2 py-0.5 rounded-full font-semibold ${isPending ? 'bg-white/10 text-white/80' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}>{project.type}</span>
                                            <span className={`font-semibold ${isPending ? 'text-white/80' : 'text-zinc-500'}`}>Status: {project.status}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <h4 className={`text-xs font-bold ${isPending ? 'text-white/70 dark:text-black/70' : 'text-zinc-500 dark:text-zinc-400'}`}>From</h4>
                                    <div className="w-full flex items-center justify-between gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                        <div className="flex-1 flex items-center gap-2 text-left">
                                            <img src={fromProfile.imageUrl} alt={fromProfile.name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-left truncate text-black dark:text-zinc-300">{fromProfile.name}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{fromProfile.specialty}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={`text-sm space-y-1 ${isPending ? 'text-white/90 dark:text-black/90' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                    <p><span className="font-semibold">Role:</span> {request.role}</p>
                                    <p><span className="font-semibold">Dates:</span> {request.dates}</p>
                                    {request.hours && <p><span className="font-semibold">Hours:</span> {request.hours}</p>}
                                    {request.location && <p><span className="font-semibold">Location:</span> {request.location}</p>}
                                </div>
                                
                                {request.status === 'pending' ? (
                                    <div className="flex gap-2 pt-2 border-t-2 border-zinc-100 dark:border-zinc-700 text-xs font-bold">
                                        <button onClick={() => onAccept(request.id, 'accepted')} className="flex-1 bg-white text-black dark:bg-black dark:text-white py-2 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800">
                                            Accept
                                        </button>
                                        <button onClick={() => onDecline(request.id, 'declined')} className="flex-1 bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400 py-2 rounded-md hover:bg-red-200 dark:hover:bg-red-900">
                                            Decline
                                        </button>
                                    </div>
                                ) : (
                                    <p className={`pt-2 border-t-2 border-zinc-100 dark:border-zinc-700 mt-3 text-sm font-bold ${request.status === 'accepted' ? 'text-green-500' : 'text-red-500'}`}>
                                        Request {request.status}.
                                    </p>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function BookingRequestsPage({ onBack, onNavigate, projects, requests, onRespond }) {
    const [expandedRequestId, setExpandedRequestId] = useState(null);

    const handleSuggestEdit = (request) => {
        const projectName = request.project.replace(/"/g, '');
        const projectToEdit = projects.find(p => p.title === projectName);
        if (projectToEdit) {
            // Navigate to the project detail page to allow for editing/discussion
            onNavigate('projectDetail', projectToEdit);
        } else {
            console.warn("Project not found:", projectName);
            // In a real app, you might show a user-friendly error message here
        }
    };

    const handleToggleExpand = (requestId) => {
        setExpandedRequestId(prevId => (prevId === requestId ? null : requestId));
    };

    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Booking Requests" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3 space-y-3">
                {requests.length > 0 ? requests.map(req => {
                    const projectName = req.project.replace(/"/g, '');
                    const project = projects.find(p => p.title === projectName);
                    
                    return (
                        <BookingRequestCard 
                            key={req.id} 
                            request={req} 
                            project={project}
                            onAccept={onRespond}
                            onDecline={onRespond}
                            onSuggestEdit={handleSuggestEdit}
                            isExpanded={expandedRequestId === req.id}
                            onToggleExpand={() => handleToggleExpand(req.id)}
                        />
                    );
                }) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10">
                        <Link className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold">No Booking Requests</h2>
                        <p className="text-sm mt-1">You have no new availability or booking requests.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function ProjectBudgetPage({ onBack, project }) {
    const title = project?.name ? `${project.name} / Project Budget` : "Project Budget";
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b-2 border-black dark:border-zinc-700 p-3">
                 <div className="flex items-center justify-center relative h-8">
                    <h1 className="font-bold text-lg dark:text-white">{title}</h1>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                <div className="text-center text-zinc-500">
                    <Wallet className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <h2 className="mt-4 font-bold text-lg">Project Budget</h2>
                    <p className="text-sm mt-1">This page will be built in the next step.</p>
                </div>
            </main>
        </div>
    );
}

function WeeklyScheduleManager() {
    const daysOfWeek = [
        { key: 'SA', name: 'Saturday' },
        { key: 'SU', name: 'Sunday' },
        { key: 'MO', name: 'Monday' },
        { key: 'TU', name: 'Tuesday' },
        { key: 'WE', name: 'Wednesday' },
        { key: 'TH', name: 'Thursday' },
        { key: 'FR', name: 'Friday' },
    ];

    const BRUSH_TYPES = {
        Work: { color: 'bg-blue-500', label: 'Work', icon: Briefcase },
        Rest: { color: 'bg-green-500', label: 'Rest', icon: LifeBuoy },
        Off: { color: 'bg-zinc-400', label: 'Off', icon: Moon },
    };
    
    // Default schedule
    const createDefaultSchedule = () => {
        const schedule = {};
        daysOfWeek.forEach(day => {
            schedule[day.key] = Array(24).fill('Rest'); // Default all to Rest
        });
        // Set work hours 9am to 5pm (17:00) on weekdays
        ['MO', 'TU', 'WE', 'TH'].forEach(dayKey => {
            for(let i=9; i < 17; i++) {
                schedule[dayKey][i] = 'Work';
            }
        });
         // Set weekend to Off
        ['SA', 'SU', 'FR'].forEach(dayKey => {
             schedule[dayKey] = Array(24).fill('Off');
        });
        return schedule;
    };

    const [schedule, setSchedule] = useState(() => {
        try {
            const savedSchedule = localStorage.getItem('oneCrewWeeklySchedule');
            return savedSchedule ? JSON.parse(savedSchedule) : createDefaultSchedule();
        } catch (e) {
            console.error("Failed to load schedule from localStorage", e);
            return createDefaultSchedule();
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('oneCrewWeeklySchedule', JSON.stringify(schedule));
        } catch (e) {
            console.error("Failed to save schedule to localStorage", e);
        }
    }, [schedule]);

    const [selectedBrush, setSelectedBrush] = useState('Work');
    const [isMouseDown, setIsMouseDown] = useState(false);

    const handleCellInteraction = (dayKey, hour) => {
        setSchedule(prev => {
            const newDaySchedule = [...prev[dayKey]];
            newDaySchedule[hour] = selectedBrush;
            return { ...prev, [dayKey]: newDaySchedule };
        });
    };

    const handleMouseDown = (dayKey, hour) => {
        setIsMouseDown(true);
        handleCellInteraction(dayKey, hour);
    };

    const handleMouseEnter = (dayKey, hour) => {
        if (isMouseDown) {
            handleCellInteraction(dayKey, hour);
        }
    };
    
    useEffect(() => {
        const handleMouseUp = () => setIsMouseDown(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    return (
        <div className="w-full p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg">
            <h2 className="font-bold text-lg mb-4 dark:text-white">Manage Weekly Schedule</h2>
            
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-4">
                <div className="flex items-center gap-2">
                    {Object.entries(BRUSH_TYPES).map(([key, { color, label, icon: Icon }]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedBrush(key)}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors ${selectedBrush === key ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-transparent text-black dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-1" onMouseLeave={() => setIsMouseDown(false)}>
                {daysOfWeek.map(day => (
                    <div key={day.key} className="flex items-center gap-2">
                        <div className="w-16 text-right font-bold text-xs dark:text-white shrink-0">{day.name}</div>
                        <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px flex-1">
                            {Array.from({ length: 24 }).map((_, hour) => (
                                <div
                                    key={hour}
                                    onMouseDown={() => handleMouseDown(day.key, hour)}
                                    onMouseEnter={() => handleMouseEnter(day.key, hour)}
                                    className={`h-6 w-full cursor-pointer rounded-sm transition-transform active:scale-90 ${BRUSH_TYPES[schedule[day.key][hour]]?.color || 'bg-zinc-200 dark:bg-zinc-700'}`}
                                ></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 mt-2">
                <div className="w-16 shrink-0"></div>
                <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px flex-1 text-center text-[10px] text-zinc-500 dark:text-zinc-400">
                    {Array.from({ length: 24 }).map((_, hour) => (
                        <span key={hour} className={hour % 2 === 0 ? 'opacity-100' : 'opacity-0'}>{hour.toString().padStart(2, '0')}</span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SPage({ onBack, onNavigate }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <AgendaTopBar onNavigate={onNavigate} />
            <main className="flex-1 overflow-y-auto p-3">
                <WeeklyScheduleManager />
            </main>
        </div>
    );
}

function AgendaTopBar({ onNavigate, showCalendarToggle, calendarView, setCalendarView }) {
    return (
        <div className="h-12 bg-white dark:bg-zinc-900 border-b-2 border-black dark:border-zinc-700 flex items-center justify-between px-3">
            <div>
                {showCalendarToggle && (
                     <button 
                        onClick={() => setCalendarView(v => v === 'week' ? 'month' : 'week')}
                        className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onNavigate('wall')} className="px-4 py-1 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold text-sm rounded-md">
                    Today
                </button>
                <button onClick={() => onNavigate('allAgenda')} className="px-4 py-1 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold text-sm rounded-md">
                    All Tasks
                </button>
                <button onClick={() => onNavigate('sPage')} className="px-4 py-1 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-white font-semibold text-sm rounded-md">
                    Manage
                </button>
            </div>
        </div>
    );
}

function AllAgendaPage({ onBack, onNavigate, agenda, onProfileSelect }) {
    const today = new Date('2025-10-03T00:00:00'); // Friday
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const fullDayNames = { SU: 'Sunday', MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday', TH: 'Thursday', FR: 'Friday', SA: 'Saturday' };
    const [expandedEventId, setExpandedEventId] = useState(null);
    const [collaborationRequests, setCollaborationRequests] = useState({});

    const handleToggleExpand = (eventId) => {
        setExpandedEventId(prevId => (prevId === eventId ? null : eventId));
    };

    const handleCollaborationRequest = (eventId, attendeeId) => {
        const key = `${eventId}-${attendeeId}`;
        setCollaborationRequests(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };
    
    const statusColors = {
        "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "Pending": "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
        "On Hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const isTaskActive = (task) => {
        if (!task.inTime || !task.outTime) return false;

        const now = new Date();
        const [startHours, startMinutes] = task.inTime.split(':').map(Number);
        const [endHours, endMinutes] = task.outTime.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHours, startMinutes, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHours, endMinutes, 0, 0);

        return now >= startTime && now <= endTime;
    };

    const futureEventsByDay = useMemo(() => {
        const todayIndex = today.getDay(); // 5 for Friday
        const orderedDayMap = [...dayMap.slice(todayIndex), ...dayMap.slice(0, todayIndex)];
        
        const eventsList = [];
        orderedDayMap.forEach((dayKey, index) => {
            const dayEvents = agenda[dayKey];
            if (dayEvents && dayEvents.length > 0) {
                 const date = new Date(today);
                 date.setDate(today.getDate() + index);

                 eventsList.push({
                    date,
                    dayKey,
                    events: dayEvents.sort((a,b) => (a.inTime || '99:99').localeCompare(b.inTime || '99:99'))
                 })
            }
        });
        
        return eventsList;

    }, [agenda]);

    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <AgendaTopBar onNavigate={onNavigate} />
            <main className="flex-1 overflow-y-auto p-3 space-y-4">
                {futureEventsByDay.length > 0 ? (
                    futureEventsByDay.map(({ date, dayKey, events }) => {
                        return (
                            <div key={dayKey}>
                                <h2 className="font-bold text-lg dark:text-white mb-2">{fullDayNames[dayKey]}, {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</h2>
                                <div className="space-y-3">
                                    {events.map((item, index) => {
                                        const isExpanded = expandedEventId === item.id;
                                        return (
                                            <motion.div 
                                                key={item.id || index}
                                                layout
                                                className={'bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-400 dark:border-zinc-700 rounded-lg overflow-hidden transition-colors duration-300'}
                                            >
                                                <button
                                                    onClick={() => handleToggleExpand(item.id)}
                                                    className={`w-full flex items-start justify-between gap-2 text-left transition-all duration-300 ${!isExpanded ? 'p-1.5' : 'p-3'}`}
                                                >
                                                    <p className={`w-1/2 font-extrabold whitespace-normal break-words text-zinc-500 dark:text-zinc-400 text-sm`}>
                                                        {item.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <p className={`flex-shrink-0 font-extrabold text-zinc-500 dark:text-zinc-400 text-sm`}>{item.time}</p>
                                                        <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                    </div>
                                                </button>
                                                
                                                <AnimatePresence>
                                                    {isExpanded && (
                                                        <motion.section
                                                            key="content"
                                                            initial="collapsed"
                                                            animate="open"
                                                            exit="collapsed"
                                                            variants={{
                                                                open: { opacity: 1, height: "auto" },
                                                                collapsed: { opacity: 0, height: 0 }
                                                            }}
                                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                                            className="overflow-hidden"
                                                        >
                                                            <div className="pt-3 px-3 border-t-2 border-zinc-100 dark:border-zinc-800">
                                                                <div className="flex-1 space-y-3">
                                                                    {item.description && (
                                                                        <div className="flex justify-between items-start gap-4">
                                                                            <p className={'text-sm flex-grow text-zinc-500 dark:text-zinc-500'}>{item.description}</p>
                                                                            <button 
                                                                                onClick={(e) => { e.stopPropagation(); /* No action */ }}
                                                                                className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusColors[item.status || 'Pending']}`}
                                                                            >
                                                                                {item.status || 'Pending'}
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                    {item.attendees && item.attendees.length > 0 && (
                                                                        <div className="space-y-2">
                                                                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Attendees</h4>
                                                                            {item.attendees.map(attendee => {
                                                                                const collaborationKey = `${item.id}-${attendee.id}`;
                                                                                const isCollaborateRequested = !!collaborationRequests[collaborationKey];
                                                                                return (
                                                                                    <div key={attendee.id} className="w-full flex items-center justify-between gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                                                                        <button
                                                                                            onClick={() => onProfileSelect(attendee)}
                                                                                            className="flex-1 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                                                                                        >
                                                                                            <img src={attendee.imageUrl} alt={attendee.name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                                                                                            <div className="flex-1">
                                                                                                <p className={'text-sm font-semibold text-left truncate text-black dark:text-zinc-300'}>{attendee.name}</p>
                                                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{attendee.specialty}</p>
                                                                                            </div>
                                                                                        </button>
                                                                                        <div className="flex items-center gap-1">
                                                                                            <button
                                                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                                                className="p-2 rounded-full transition-colors flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                                                                title={`${attendee.name}'s Agenda`}
                                                                                            >
                                                                                                <Calendar className="w-4 h-4" />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleCollaborationRequest(item.id, attendee.id);
                                                                                                }}
                                                                                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${isCollaborateRequested ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
                                                                                                title="Send collaboration request"
                                                                                            >
                                                                                                <Link className="w-4 h-4" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="p-2 mt-2 border-t-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                                                {item.location ? (
                                                                    <a
                                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-sm font-bold text-red-500 flex items-center gap-1.5 truncate hover:text-red-600 transition-colors"
                                                                    >
                                                                        <MapPin size={14} className="flex-shrink-0" /> <span className="truncate">{item.location}</span>
                                                                    </a>
                                                                ) : <div />}
                                                                <button onClick={() => {}} className="p-2 text-red-500 hover:text-red-600 rounded-full transition-colors">
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </motion.section>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10">
                        <Calendar className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold">No Upcoming Appointments</h2>
                        <p className="text-sm mt-1">Your schedule is clear for the near future.</p>
                    </div>
                )}
            </main>
        </div>
    );
}

function AgendaPage({ onBack, agenda, setAgenda, myTeam, onProfileSelect, onNavigate, bookingRequestCount }) {
    const days = ['SA', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR'];
    const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const todayAbbr = dayMap[new Date().getDay()];
    const [selectedDay, setSelectedDay] = useState(todayAbbr);
    const [showTodayDetails, setShowTodayDetails] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [collaborationRequests, setCollaborationRequests] = useState({});
    const [changingStatusForEvent, setChangingStatusForEvent] = useState(null);
    const [calendarView, setCalendarView] = useState('month');
    const [eventToDelete, setEventToDelete] = useState(null);

    const handleOpenEditModal = (event) => {
        setEditingEvent(event);
        setIsAddEventModalOpen(true);
    };

    const confirmDeleteEvent = () => {
        if (!eventToDelete) return;

        const dayKeyToDeleteFrom = Object.keys(agenda).find(dayKey => 
            agenda[dayKey].some(event => event.id === eventToDelete.id)
        );

        if (dayKeyToDeleteFrom) {
            setAgenda(prev => {
                const newDayEvents = prev[dayKeyToDeleteFrom].filter(e => e.id !== eventToDelete.id);
                return { ...prev, [dayKeyToDeleteFrom]: newDayEvents };
            });
        }
        setEventToDelete(null);
    };

    const handleDeleteEventRequest = (eventId) => {
        const dayAbbr = dayMap[selectedDate.getDay()];
        const event = agenda[dayAbbr]?.find(e => e.id === eventId);
        if (event) {
            setEventToDelete(event);
        }
        setIsAddEventModalOpen(false);
        setEditingEvent(null);
    };

    const isTaskActive = (task) => {
        if (!task.inTime || !task.outTime) return false;

        const now = new Date();
        const [startHours, startMinutes] = task.inTime.split(':').map(Number);
        const [endHours, endMinutes] = task.outTime.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHours, startMinutes, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHours, endMinutes, 0, 0);

        return now >= startTime && now <= endTime;
    };

    const handleCollaborationRequest = (eventId, attendeeId) => {
        const key = `${eventId}-${attendeeId}`;
        setCollaborationRequests(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const statusColors = {
        "Completed": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        "In Progress": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        "Pending": "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
        "On Hold": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        "Cancelled": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    const handleUpdateEventStatus = (newStatus) => {
        if (!changingStatusForEvent) return;
        const dayAbbr = dayMap[selectedDate.getDay()];
        setAgenda(prev => {
            const dayEvents = prev[dayAbbr] || [];
            const updatedDayEvents = dayEvents.map(event =>
                event.id === changingStatusForEvent.id ? { ...event, status: newStatus } : event
            );
            return { ...prev, [dayAbbr]: updatedDayEvents };
        });
        setChangingStatusForEvent(null);
    };

    const Separator = () => (
        <div className="h-full flex items-center justify-center">
            <div
                className="w-px h-6 bg-repeat-y"
                style={{
                    backgroundImage: 'linear-gradient(to bottom, currentColor 50%, transparent 50%)',
                    backgroundSize: '1px 4px',
                    opacity: 0.3,
                }}
            ></div>
        </div>
    );

    const year = selectedDate.getFullYear();
    const monthIndex = selectedDate.getMonth(); // 0-11
    const day = selectedDate.getDate();

    // Memos for picker values
    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => currentYear + i);
    }, []);
    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'short' })), []);
    const daysInMonth = useMemo(() => {
        const daysCount = new Date(year, monthIndex + 1, 0).getDate();
        return Array.from({ length: daysCount }, (_, i) => i + 1);
    }, [year, monthIndex]);

    // Effect to synchronize the top day selector with the date picker
    useEffect(() => {
        const dayIndex = selectedDate.getDay(); // Sunday - Saturday : 0 - 6
        const newSelectedDayAbbr = dayMap[dayIndex];
        if (newSelectedDayAbbr !== selectedDay) {
            setSelectedDay(newSelectedDayAbbr);
        }
    }, [selectedDate, dayMap, selectedDay]);


    const handleDateChange = (part, value) => {
        setSelectedDate(currentDate => {
            const newDate = new Date(currentDate);
            if (part === 'year') {
                newDate.setFullYear(value);
            } else if (part === 'month') {
                const newMonthIndex = months.indexOf(value);
                if (newMonthIndex !== -1) {
                    newDate.setMonth(newMonthIndex);
                }
            } else if (part === 'day') {
                newDate.setDate(value);
            }
            
            const maxDays = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
            if (newDate.getDate() > maxDays) {
                newDate.setDate(maxDays);
            }

            return newDate;
        });
    };

    const handleToggleDetails = () => {
        // If we are currently showing the date picker and about to hide it,
        // reset the date and selected day to the actual current system date.
        if (showTodayDetails) {
            setSelectedDate(new Date());
            setSelectedDay(todayAbbr);
        }
        setShowTodayDetails(!showTodayDetails);
    };

    const handleDaySelect = (dayAbbr) => {
        setSelectedDay(dayAbbr);
    
        const dayToIndexMap = { 'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6 };
        const today = new Date();
        const currentDayIndex = today.getDay();
        const targetDayIndex = dayToIndexMap[dayAbbr];
    
        if (targetDayIndex === undefined) return;
    
        const dayDifference = targetDayIndex - currentDayIndex;
    
        const targetDate = new Date();
        targetDate.setDate(today.getDate() + dayDifference);
    
        setSelectedDate(targetDate);
    };

    const handleToggleEventCollapse = (eventId) => {
        const dayAbbr = dayMap[selectedDate.getDay()];
        setAgenda(prevAgenda => {
            const dayEvents = prevAgenda[dayAbbr] || [];
            
            // Find the event being toggled to check its current state before any changes.
            const eventToToggle = dayEvents.find(event => event.id === eventId);
            if (!eventToToggle) return prevAgenda; // Safety check if event not found.

            // isOpening is true if the event was previously collapsed and is now being opened.
            const isOpening = eventToToggle.isCollapsed ?? true;

            const updatedDayEvents = dayEvents.map(event => {
                if (event.id === eventId) {
                    // Toggle the clicked event's collapsed state.
                    return { ...event, isCollapsed: !isOpening };
                } else if (isOpening) {
                    // If we are opening the clicked event, ensure all other events are collapsed.
                    return { ...event, isCollapsed: true };
                }
                // If we are closing an event, don't change the state of others.
                return event;
            });

            return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
        });
    };

    const handleSaveEvent = (eventData) => {
        const { id, title, inTime, outTime, description, attendees, location } = eventData;
        const dayAbbr = dayMap[selectedDate.getDay()];
        
        const formatTime12h = (time24) => {
            if (!time24) return '';
            const [hours, minutes] = time24.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        };

        const timeParts = [formatTime12h(inTime), formatTime12h(outTime)].filter(Boolean);
        const timeString = timeParts.join(' - ');

        const newOrUpdatedEvent = {
            id: id || Date.now(),
            title: title,
            time: timeString,
            inTime: inTime,
            outTime: outTime,
            location: location,
            description: description,
            attendees: attendees,
        };

        setAgenda(prevAgenda => {
            const dayEvents = prevAgenda[dayAbbr] || [];
            if (id) {
                const updatedDayEvents = dayEvents.map(e => e.id === id ? { ...e, ...newOrUpdatedEvent } : e);
                return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
            } else {
                const updatedDayEvents = [...dayEvents, { ...newOrUpdatedEvent, isCollapsed: true, status: 'Pending' }];
                return { ...prevAgenda, [dayAbbr]: updatedDayEvents };
            }
        });
        setIsAddEventModalOpen(false);
        setEditingEvent(null);
    };
    
    const agendaForSelectedDay = agenda[selectedDay] || [];

    const MonthCalendarView = () => {
        const today = new Date();
        const [currentDisplayDate, setCurrentDisplayDate] = useState(selectedDate);

        const currentYear = currentDisplayDate.getFullYear();
        const currentMonth = currentDisplayDate.getMonth();
        const currentMonthName = currentDisplayDate.toLocaleString('en-US', { month: 'short' });

        const handleDisplayDateChange = (delta, unit) => {
            setCurrentDisplayDate(current => {
                const newDate = new Date(current);
                if (unit === 'month') {
                    newDate.setMonth(newDate.getMonth() + delta);
                } else if (unit === 'year') {
                    newDate.setFullYear(newDate.getFullYear() + delta);
                }
                return newDate;
            });
        };
        
        const handleDayClick = (day) => {
            const newDate = new Date(currentYear, currentMonth, day);
            setSelectedDate(newDate);
        };
        
        const daysOfWeek = ['SA', 'SU', 'MO', 'TU', 'WE', 'TH', 'FR'];

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const dayOffset = (firstDayOfMonth + 1) % 7;

        const calendarDays = [];
        for (let i = 0; i < dayOffset; i++) {
            calendarDays.push(<div key={`empty-${i}`} className="w-5 h-5"></div>);
        }
        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
            const isSelected = day === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();
            
            calendarDays.push(
                <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`w-5 h-5 flex items-center justify-center rounded-full font-bold text-xs transition-colors
                        ${isToday
                            ? 'bg-red-500 text-white'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }
                        ${isSelected
                            ? 'border-2 border-black dark:border-white'
                            : ''
                        }
                    `}
                >
                    {day}
                </button>
            );
        }
        
        // To prevent the layout from shifting when changing months,
        // we ensure the calendar grid always has a fixed height of 6 rows.
        const totalCells = 42; // 6 rows * 7 columns, which is the maximum a month can take.
        while (calendarDays.length < totalCells) {
            calendarDays.push(<div key={`empty-fill-${calendarDays.length}`} className="w-5 h-5"></div>);
        }
        
        return (
            <div className="p-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex gap-0.5">
                <div className="w-32 flex flex-col gap-0.5">
                    <div className="flex-1 bg-white dark:bg-zinc-200 rounded-md flex items-center justify-between px-1">
                        <button onClick={() => handleDisplayDateChange(-1, 'year')} className="p-1 text-zinc-600 rounded-full hover:bg-zinc-300"><ChevronLeftIcon size={14}/></button>
                        <span className="font-bold text-lg text-zinc-700">{currentYear}</span>
                        <button onClick={() => handleDisplayDateChange(1, 'year')} className="p-1 text-zinc-600 rounded-full hover:bg-zinc-300"><ChevronRightIcon size={14}/></button>
                    </div>
                    <div className="flex-1 bg-white dark:bg-zinc-200 rounded-md flex items-center justify-between px-1">
                        <button onClick={() => handleDisplayDateChange(-1, 'month')} className="p-1 text-zinc-600 rounded-full hover:bg-zinc-300"><ChevronLeftIcon size={14}/></button>
                        <span className="font-bold text-sm text-zinc-700 truncate">{currentMonthName}</span>
                        <button onClick={() => handleDisplayDateChange(1, 'month')} className="p-1 text-zinc-600 rounded-full hover:bg-zinc-300"><ChevronRightIcon size={14}/></button>
                    </div>
                </div>
                <div className="flex-1 bg-white dark:bg-zinc-200 rounded-md p-0.5">
                    <div className="grid grid-cols-7 gap-px text-center mb-0.5">
                        {daysOfWeek.map(day => (
                            <div key={day} className={`font-bold text-xs ${day === 'MO' ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-600'}`}>{day}</div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-px text-center items-center">
                        {calendarDays}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full flex flex-col bg-zinc-50 dark:bg-black relative">
            <AgendaTopBar 
                onNavigate={onNavigate} 
                showCalendarToggle={true}
                calendarView={calendarView}
                setCalendarView={setCalendarView}
            />
            <div className="p-3 bg-white dark:bg-zinc-900 relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={calendarView}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                    >
                        {calendarView === 'week' ? (
                            <div className="relative w-full">
                                <div className="relative z-0 flex justify-center items-center -space-x-1">
                                    {days.map(day => {
                                        const isCurrentDay = day === todayAbbr;
                                        const isSelectedDay = selectedDay === day;
            
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => handleDaySelect(day)}
                                                className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border-2
                                                    ${isCurrentDay
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-zinc-200 dark:bg-zinc-700 text-black dark:text-white'
                                                    }
                                                    ${isSelectedDay
                                                        ? 'border-black dark:border-white z-10'
                                                        : 'border-transparent hover:border-zinc-400 dark:hover:border-zinc-500'
                                                    }`
                                                }
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="absolute bottom-[-36px] inset-x-10 h-12 bg-zinc-300 dark:bg-zinc-800 rounded-full flex items-center justify-center z-10">
                                    <div className="w-full h-full relative flex items-center justify-center">
                                        <AnimatePresence mode="wait">
                                            {showTodayDetails ? (
                                                <motion.div
                                                    key="details"
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex items-stretch justify-around w-full h-12 pl-4 pr-12 text-black dark:text-white"
                                                >
                                                    <div className="w-20 text-center h-full">
                                                        <ScrollPicker values={years} selectedValue={year} onSelect={(y) => handleDateChange('year', y)} className="text-3xl" />
                                                    </div>
                                                    <Separator />
                                                    <div className="w-20 text-center h-full">
                                                        <ScrollPicker values={months} selectedValue={months[monthIndex]} onSelect={(m) => handleDateChange('month', m)} className="text-3xl" />
                                                    </div>
                                                    <Separator />
                                                    <div className="w-20 text-center h-full">
                                                        <ScrollPicker values={daysInMonth} selectedValue={day} onSelect={(d) => handleDateChange('day', d)} className="text-3xl" />
                                                    </div>
                                                </motion.div>
                                            ) : (
                                                <motion.span
                                                    key="today"
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="font-bold text-lg text-black dark:text-white"
                                                >
                                                    {selectedDay === todayAbbr 
                                                        ? 'Today' 
                                                        : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)
                                                    }
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
        
                                        <button
                                            onClick={handleToggleDetails}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 flex-shrink-0"
                                        >
                                            <div className="w-2 h-2 bg-black dark:bg-white rounded-full"></div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                           <MonthCalendarView />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
            
            {/* Spacer for the hanging week-view date picker */}
            {calendarView === 'week' && <div className="h-9 w-full bg-white dark:bg-zinc-900" />}

            <main className="flex-1 overflow-y-auto px-3 pb-20 pt-3">
                {agendaForSelectedDay.length > 0 ? (
                    <div className="space-y-3">
                        {agendaForSelectedDay.map((item, index) => {
                            const isCollapsed = item.isCollapsed ?? true;

                            return (
                             <motion.div 
                                key={item.id || index}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={'bg-zinc-200 dark:bg-zinc-800 border-2 border-zinc-400 dark:border-zinc-700 rounded-lg overflow-hidden transition-colors duration-300'}
                            >
                                <button
                                    onClick={() => handleToggleEventCollapse(item.id)}
                                    className={`w-full flex items-start justify-between gap-2 text-left transition-all duration-300 ${isCollapsed ? 'p-1.5' : 'p-3'}`}
                                >
                                    <p className={`w-1/2 font-extrabold whitespace-normal break-words text-zinc-500 dark:text-zinc-400 text-sm`}>
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <p className={`flex-shrink-0 font-extrabold text-zinc-500 dark:text-zinc-400 text-sm`}>{item.time}</p>
                                        <MessageSquare className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    </div>
                                </button>
                                
                                <AnimatePresence initial={false}>
                                    {!(item.isCollapsed ?? true) && (
                                        <motion.section
                                            key="content"
                                            initial="collapsed"
                                            animate="open"
                                            exit="collapsed"
                                            variants={{
                                                open: { opacity: 1, height: "auto" },
                                                collapsed: { opacity: 0, height: 0 }
                                            }}
                                            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                                            className="overflow-hidden"
                                        >
                                            <div className="pt-3 px-3 border-t-2 border-zinc-100 dark:border-zinc-800">
                                                <div className="flex-1 space-y-3">
                                                    {item.description && (
                                                        <div className="flex justify-between items-start gap-4">
                                                            <p className={'text-sm flex-grow text-zinc-500 dark:text-zinc-500'}>{item.description}</p>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setChangingStatusForEvent(item);
                                                                }}
                                                                className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0 ${statusColors[item.status || 'Pending']}`}
                                                            >
                                                                {item.status || 'Pending'}
                                                            </button>
                                                        </div>
                                                    )}
                                                            {item.attendees && item.attendees.length > 0 && (
                                                        <div className="space-y-2">
                                                            <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Attendees</h4>
                                                            {item.attendees.map(attendee => {
                                                                const collaborationKey = `${item.id}-${attendee.id}`;
                                                                const isCollaborateRequested = !!collaborationRequests[collaborationKey];
                                                                return (
                                                                    <div key={attendee.id} className="w-full flex items-center justify-between gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                                                                        <button
                                                                            onClick={() => onProfileSelect(attendee)}
                                                                            className="flex-1 flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
                                                                        >
                                                                            <img src={attendee.imageUrl} alt={attendee.name} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" />
                                                                            <div className="flex-1">
                                                                                <p className={'text-sm font-semibold text-left truncate text-black dark:text-zinc-300'}>{attendee.name}</p>
                                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">{attendee.specialty}</p>
                                                                            </div>
                                                                        </button>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); }}
                                                                                className="p-2 rounded-full transition-colors flex-shrink-0 bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                                                                title={`${attendee.name}'s Agenda`}
                                                                            >
                                                                                <Calendar className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleCollaborationRequest(item.id, attendee.id);
                                                                                }}
                                                                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${isCollaborateRequested ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600'}`}
                                                                                title="Send collaboration request"
                                                                            >
                                                                                <Link className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-2 mt-2 border-t-2 border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                                                {item.location ? (
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-bold text-red-500 flex items-center gap-1.5 truncate hover:text-red-600 transition-colors"
                                                    >
                                                        <MapPin size={14} className="flex-shrink-0" /> <span className="truncate">{item.location}</span>
                                                    </a>
                                                ) : <div />}
                                                <div className="flex items-center">
                                                    <button onClick={() => handleOpenEditModal(item)} className="p-2 text-red-500 hover:text-red-600 rounded-full transition-colors">
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.section>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )})}
                    </div>
                ) : (
                    <div className="text-center text-zinc-500 dark:text-zinc-400 mt-16 flex flex-col items-center">
                        <Calendar className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                        <h2 className="mt-4 font-bold text-lg">Nothing Scheduled</h2>
                        <p className="text-sm mt-1">You have no events for this day.</p>
                    </div>
                )}
            </main>
            <div className="absolute bottom-4 inset-x-0 flex justify-center z-20">
                <button onClick={() => { setEditingEvent(null); setIsAddEventModalOpen(true); }} className="w-14 h-14 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg hover:scale-105 active:scale-95 transition-transform">
                    <Plus className="w-7 h-7" />
                </button>
            </div>
            {/* New button with notification badge */}
            <div className="absolute bottom-4 right-4 z-20">
                <button
                    onClick={() => onNavigate('bookingRequests')}
                    className="relative bg-red-500 text-white p-3 rounded-full shadow-lg hover:bg-red-600 active:scale-95 transition-transform"
                    aria-label="Availability & Booking"
                >
                    <Link className="w-6 h-6" />
                    {bookingRequestCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                            {bookingRequestCount}
                        </div>
                    )}
                </button>
            </div>
            <AddEventModal 
                isOpen={isAddEventModalOpen}
                onClose={() => {
                    setIsAddEventModalOpen(false);
                    setEditingEvent(null);
                }}
                onSave={handleSaveEvent}
                myTeam={myTeam}
                eventToEdit={editingEvent}
                onDelete={handleDeleteEventRequest}
            />
            <ChangeStatusModal
                isOpen={!!changingStatusForEvent}
                onClose={() => setChangingStatusForEvent(null)}
                onSave={handleUpdateEventStatus}
                currentStatus={changingStatusForEvent?.status}
            />
            <DeleteConfirmationModal
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={confirmDeleteEvent}
                itemName="this event"
            />
        </div>
    );
}

function AddEventModal({ isOpen, onClose, onSave, myTeam, eventToEdit, onDelete }) {
    const [eventName, setEventName] = useState('');
    const [description, setDescription] = useState('');
    const [attendees, setAttendees] = useState([]);
    const [isTeamPopupOpen, setIsTeamPopupOpen] = useState(false);
    const [inTime, setInTime] = useState('');
    const [outTime, setOutTime] = useState('');
    const [isPickingStartTime, setIsPickingStartTime] = useState(false);
    const [isPickingEndTime, setIsPickingEndTime] = useState(false);
    const [location, setLocation] = useState('');
    const [showLocationOptions, setShowLocationOptions] = useState(false);
    const [isStudioSelectionOpen, setIsStudioSelectionOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (eventToEdit) {
                setEventName(eventToEdit.title || '');
                setDescription(eventToEdit.description || '');
                setAttendees(eventToEdit.attendees || []);
                setInTime(eventToEdit.inTime || '');
                setOutTime(eventToEdit.outTime || '');
                setLocation(eventToEdit.location || '');
            }
        } else {
            setEventName('');
            setDescription('');
            setAttendees([]);
            setInTime('');
            setOutTime('');
            setLocation('');
            setIsPickingStartTime(false);
            setIsPickingEndTime(false);
            setShowLocationOptions(false);
            setIsStudioSelectionOpen(false);
        }
    }, [isOpen, eventToEdit]);

    const handleSave = () => {
        if (eventName.trim()) {
            onSave({ 
                id: eventToEdit ? eventToEdit.id : null,
                title: eventName, 
                description, 
                inTime, 
                outTime, 
                attendees,
                location
            });
        }
    };
    
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    const handleRemoveAttendee = (attendeeId) => {
        setAttendees(prev => prev.filter(a => a.id !== attendeeId));
    };

    const formatDisplayTime = (time24) => {
        if (!time24) return null;
        const [hours, minutes] = time24.split(':');
        let h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        h = h ? h : 12; // the hour '0' should be '12'
        return `${h}:${minutes} ${ampm}`;
    };

    const handleSelectStudio = (studioName) => {
        setLocation(studioName);
        setIsStudioSelectionOpen(false);
        setShowLocationOptions(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 p-4 space-y-4"
                        onClick={e => e.stopPropagation()}
                    >
                        <input
                            type="text"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Event Name"
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                            autoFocus
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description"
                            className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white resize-none"
                            rows="3"
                        />
                        <div className="relative">
                             <div className="relative">
                                <MapPin className="w-4 h-4 text-zinc-400 absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    onFocus={() => setShowLocationOptions(true)}
                                    onBlur={() => setTimeout(() => setShowLocationOptions(false), 150)}
                                    placeholder="Location"
                                    className="w-full p-2 pl-9 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white"
                                />
                            </div>
                            <AnimatePresence>
                            {showLocationOptions && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -5, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                                    exit={{ opacity: 0, y: -5, height: 0 }}
                                    className="mt-2 grid grid-cols-3 gap-2"
                                >
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsStudioSelectionOpen(true)} className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-md text-black dark:text-white font-semibold text-xs">Select Studio</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => {}} className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-md text-black dark:text-white font-semibold text-xs">Map Location</button>
                                    <button onMouseDown={(e) => e.preventDefault()} onClick={() => setShowLocationOptions(false)} className="p-2 bg-zinc-200 dark:bg-zinc-700 rounded-md text-black dark:text-white font-semibold text-xs">Add Manually</button>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-bold text-zinc-600 dark:text-zinc-400">Attendees</h3>
                                <button
                                    onClick={() => setIsTeamPopupOpen(true)}
                                    className="p-1 bg-zinc-200 dark:bg-zinc-700 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-600"
                                    aria-label="Add attendee"
                                >
                                    <UserPlus className="w-4 h-4 text-black dark:text-white" />
                                </button>
                            </div>
                            <div className="space-y-2 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-md min-h-[50px]">
                                {attendees.length > 0 ? attendees.map(attendee => (
                                    <div key={attendee.id} className="flex items-center justify-between bg-white dark:bg-zinc-700 p-1.5 rounded">
                                        <div className="flex items-center gap-2">
                                            <img src={attendee.imageUrl} alt={attendee.name} className="w-8 h-8 rounded-full"/>
                                            <div>
                                                <p className="text-sm font-semibold dark:text-white">{attendee.name}</p>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{attendee.specialty}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemoveAttendee(attendee.id)} className="p-1 text-zinc-400 hover:text-red-500 rounded-full">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )) : <p className="text-xs text-zinc-400 text-center py-2">Add people to this event...</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-full">
                                {isPickingStartTime ? (
                                    <input
                                        type="time"
                                        value={inTime}
                                        onChange={e => setInTime(e.target.value)}
                                        onBlur={() => setIsPickingStartTime(false)}
                                        autoFocus
                                        className="w-full p-2 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white text-center font-semibold"
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsPickingStartTime(true)}
                                        className="w-full p-2 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white text-center font-semibold"
                                    >
                                        {inTime ? formatDisplayTime(inTime) : 'Start'}
                                    </button>
                                )}
                            </div>
                            <div className="w-full">
                                {isPickingEndTime ? (
                                    <input
                                        type="time"
                                        value={outTime}
                                        onChange={e => setOutTime(e.target.value)}
                                        onBlur={() => setIsPickingEndTime(false)}
                                        autoFocus
                                        className="w-full p-2 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white text-center font-semibold"
                                    />
                                ) : (
                                    <button
                                        onClick={() => setIsPickingEndTime(true)}
                                        className="w-full p-2 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white text-center font-semibold"
                                    >
                                        {outTime ? formatDisplayTime(outTime) : 'End'}
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            className="w-full bg-black dark:bg-white text-white dark:text-black font-bold py-2 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200"
                        >
                            Save
                        </button>
                        {eventToEdit && (
                            <button
                                onClick={() => onDelete(eventToEdit.id)}
                                className="w-full bg-red-500 text-white font-bold py-2 rounded-lg hover:bg-red-600 mt-2"
                            >
                                Delete
                            </button>
                        )}
                    </motion.div>
                    <StudioSelectionModal 
                        isOpen={isStudioSelectionOpen}
                        onClose={() => setIsStudioSelectionOpen(false)}
                        onSelect={handleSelectStudio}
                    />
                    <TeamMemberPopup
                        isOpen={isTeamPopupOpen}
                        onClose={() => setIsTeamPopupOpen(false)}
                        myTeam={myTeam}
                        onSelectUser={(user) => {
                            if (!attendees.some(a => a.id === user.id)) {
                                setAttendees(prev => [...prev, user]);
                            }
                            setIsTeamPopupOpen(false);
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function StudioSelectionModal({ isOpen, onClose, onSelect }) {
    const studios = useMemo(() => 
        MOCK_COMPANIES.filter(c => STUDIO_CATEGORIES.includes(c.category))
    , []);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col max-h-[70vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700 flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <h2 className="font-bold text-lg dark:text-white">Select Studio</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5 dark:text-white" /></button>
                            </div>
                        </header>
                        <main className="flex-1 p-2 overflow-y-auto">
                            <div className="space-y-2">
                                {studios.map(studio => (
                                    <button 
                                        key={studio.id} 
                                        onClick={() => onSelect(studio.name)}
                                        className="w-full text-left p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                    >
                                        <p className="font-semibold dark:text-white">{studio.name}</p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{studio.location}</p>
                                    </button>
                                ))}
                            </div>
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ColorPickerModal({ isOpen, onClose, onSelect, currentColor }) {
    const PREDEFINED_COLORS = [
        { name: 'Default', hex: '#000000' },
        { name: 'Red', hex: '#EF4444' },
        { name: 'Blue', hex: '#3B82F6' },
        { name: 'Green', hex: '#22C55E' },
        { name: 'Orange', hex: '#F97316' },
        { name: 'Purple', hex: '#8B5CF6' },
        { name: 'Teal', hex: '#14B8A6' },
    ];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">Choose Color</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-4 grid grid-cols-4 gap-4">
                            {PREDEFINED_COLORS.map(color => (
                                <button
                                    key={color.name}
                                    onClick={() => {
                                        onSelect(color.hex);
                                        onClose();
                                    }}
                                    className="aspect-square rounded-full flex items-center justify-center transition-transform hover:scale-110"
                                    style={{ backgroundColor: color.hex }}
                                >
                                    {currentColor === color.hex && (
                                        <Check className="w-6 h-6 text-white" style={{ filter: 'drop-shadow(0 1px 2px rgb(0 0 0 / 0.5))' }} />
                                    )}
                                </button>
                            ))}
                        </main>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function ClothingNotesModal({ isOpen, onClose, onSave, initialNotes, title }) {
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            setNotes(initialNotes || '');
        }
    }, [isOpen, initialNotes]);

    const handleSave = () => {
        onSave(notes);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-xs bg-white dark:bg-zinc-900 rounded-lg border-2 border-black dark:border-zinc-700 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <header className="p-3 border-b-2 border-black dark:border-zinc-700">
                            <div className="flex justify-between items-center dark:text-white">
                                <h2 className="font-bold text-lg">{title || "Notes"}</h2>
                                <button onClick={onClose} className="p-1"><X className="w-5 h-5" /></button>
                            </div>
                        </header>
                        <main className="p-3">
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Write your notes here..."
                                rows="6"
                                className="w-full p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white dark:text-white resize-none"
                            ></textarea>
                        </main>
                        <footer className="p-3 border-t-2 border-black dark:border-zinc-700">
                            <button onClick={handleSave} className="w-full bg-black text-white text-sm font-bold py-2.5 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                                Save
                            </button>
                        </footer>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function SettingsPage({ onBack, onNavigate, theme, onToggleTheme, onOpenColorPicker, selectedAppColor }) {
    const settingsItems = [
        { title: "My Account", icon: User, action: () => {} },
        { title: "My Team", icon: UsersIcon, action: () => onNavigate('myTeam') },
        { title: "Privacy Policy", icon: Shield, action: () => {} },
        { title: "Terms of Service", icon: FileText, action: () => {} },
        { title: "Help Center", icon: HelpCircle, action: () => {} },
        { title: "Chat with us", icon: MessageSquare, action: () => {} },
        { title: "Color", icon: Palette, action: onOpenColorPicker },
        { title: "Language", icon: Languages, action: () => onNavigate('changeLanguage') },
    ];

    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Settings" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3">
                <div className="space-y-2">
                    {settingsItems.map(item => {
                        if (item.title === "Color") {
                            return (
                                <button key={item.title} onClick={item.action} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg text-left">
                                    <div className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5 dark:text-white" />
                                        <span className="font-semibold dark:text-white">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border-2 border-zinc-400 dark:border-zinc-600" style={{ backgroundColor: selectedAppColor }}></div>
                                        <ChevronRight className="w-5 h-5 text-zinc-400" />
                                    </div>
                                </button>
                            );
                        }
                        return (
                            <button key={item.title} onClick={item.action} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg text-left">
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-5 h-5 dark:text-white" />
                                    <span className="font-semibold dark:text-white">{item.title}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                            </button>
                        );
                    })}
                    <div className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Sun className="w-5 h-5 dark:text-white" />
                            <span className="font-semibold dark:text-white">Dark Mode</span>
                        </div>
                        <button onClick={onToggleTheme} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${theme === 'dark' ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                     <button onClick={() => {}} className="w-full flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg text-left">
                        <div className="flex items-center gap-3 dark:text-white">
                            <LogIn className="w-5 h-5" />
                            <span className="font-semibold">Log in</span>
                        </div>
                    </button>
                </div>
            </main>
        </div>
    );
}

function PrivacyPolicyPage({ onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Privacy Policy" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                <p>Last updated: October 1, 2025</p>
                <p>One Crew ("us", "we", or "our") operates the One Crew mobile application (the "Service").</p>
                <h2 className="font-bold text-lg text-black dark:text-white pt-2">Information Collection and Use</h2>
                <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
                <h2 className="font-bold text-lg text-black dark:text-white pt-2">Types of Data Collected</h2>
                <p>Personal Data: While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data").</p>
                <h2 className="font-bold text-lg text-black dark:text-white pt-2">Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us.</p>
            </main>
        </div>
    );
}

function TermsOfServicePage({ onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Terms of Service" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-4 space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
                <p>Please read these Terms of Service ("Terms", "Terms of Service") carefully before using the One Crew mobile application (the "Service") operated by One Crew ("us", "we", or "our").</p>
                 <h2 className="font-bold text-lg text-black dark:text-white pt-2">Accounts</h2>
                <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                <h2 className="font-bold text-lg text-black dark:text-white pt-2">Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us.</p>
            </main>
        </div>
    );
}

function HelpCenterPage({ onBack }) {
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Help Center" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
                 <div className="text-center text-zinc-500">
                    <HelpCircle className="w-16 h-16 mx-auto text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm mt-4">For any assistance, please contact our support team.</p>
                </div>
            </main>
        </div>
    );
}

function ChatWithUsPage({ onBack }) {
     const supportProfile = { name: "One Crew Support", imageUrl: createPlaceholder(100, 100, '007bff', 'ffffff', 'CS'), onlineStatus: 'online' };
    return (
         <ChatPage profile={supportProfile} onBack={onBack} />
    );
}

function ChangeLanguagePage({ onBack, currentLanguage, onSelectLanguage }) {
    const languages = [
        { code: 'en', name: 'English' },
        { code: 'ar', name: 'العربية' },
    ];
    return (
        <div className="h-full w-full flex flex-col bg-zinc-100 dark:bg-black">
            <PageHeader title="Change Language" onBack={onBack} />
            <main className="flex-1 overflow-y-auto p-3 space-y-2">
                {languages.map(lang => (
                     <button
                        key={lang.code}
                        onClick={() => { onSelectLanguage(lang.code); onBack(); }}
                        className={`w-full p-3 bg-white dark:bg-zinc-900 border-2 border-black dark:border-zinc-700 rounded-lg flex items-center justify-between ${currentLanguage === lang.code ? 'ring-2 ring-offset-2 ring-black dark:ring-white' : ''}`}
                    >
                        <span className="font-semibold dark:text-white">{lang.name}</span>
                        {currentLanguage === lang.code && <Check className="w-5 h-5 text-black dark:text-white" />}
                    </button>
                ))}
            </main>
        </div>
    );
}

function AuthPage({ onLogin, onBack }) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-black p-4">
            <h1 className="text-2xl font-bold dark:text-white">Welcome Back</h1>
            <p className="text-zinc-500 mb-8">Login to your account.</p>
            <div className="w-full max-w-sm space-y-3">
                <input className="w-full p-3 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white" placeholder="Email" type="email" />
                <input className="w-full p-3 bg-white dark:bg-zinc-800 rounded-lg border-2 border-zinc-300 dark:border-zinc-700 outline-none focus:border-black dark:focus:border-white" placeholder="Password" type="password" />
                <button onClick={onLogin} className="w-full bg-black text-white font-bold py-3 rounded-lg hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">Login</button>
            </div>
        </div>
    );
}

function App() {
    const [showSplash, setShowSplash] = useState(true);
    const [authState, setAuthState] = useState('guest'); // 'splash' is handled by showSplash, 'auth' is bypassed
    const [user, setUser] = useState({ name: 'Guest' });
    const [history, setHistory] = useState([{ name: 'wall', data: null }]);
    const page = history[history.length - 1];
    const [projects, setProjects] = useState(() => {
        try {
            const savedProjects = localStorage.getItem('oneCrewProjects');
            return savedProjects ? JSON.parse(savedProjects) : MOCK_PROJECTS_DATA;
        } catch (error) {
            console.error("Could not read projects from localStorage", error);
            return MOCK_PROJECTS_DATA;
        }
    });
    const [dreamProjects, setDreamProjects] = useState(() => {
        try {
            const savedDreamProjects = localStorage.getItem('oneCrewDreamProjects');
            return savedDreamProjects ? JSON.parse(savedDreamProjects) : [{ id: 1, name: 'Project 1' }];
        } catch (error) {
            console.error("Could not read dream projects from localStorage", error);
            return [{ id: 1, name: 'Project 1' }];
        }
    });
    const [agenda, setAgenda] = useState(() => {
        try {
            const saved = localStorage.getItem('oneCrewAgenda');
            return saved ? JSON.parse(saved) : MOCK_AGENDA;
        } catch (e) {
            console.error("Failed to load agenda from localStorage", e);
            return MOCK_AGENDA;
        }
    });
    const [bookingRequests, setBookingRequests] = useState(() => {
        try {
            const saved = localStorage.getItem('oneCrewBookingRequests');
            return saved ? JSON.parse(saved) : MOCK_BOOKING_REQUESTS;
        } catch (e) {
            console.error("Failed to load booking requests from localStorage", e);
            return MOCK_BOOKING_REQUESTS;
        }
    });
    const [advancedFilter, setAdvancedFilter] = useState({ type: 'All', locations: [], sort: 'Recommended' });
    const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
    const [storeFilterOpen, setStoreFilterOpen] = useState(false);
    const [storeFilter, setStoreFilter] = useState({ types: ['All'], categories: [], brands: [], sort: 'recommended', rating: 0, priceRange: { min: 0, max: MAX_PRODUCT_PRICE } });
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [tab, setTab] = useState("wall");
    const [myTeam, setMyTeam] = useState(() => {
        try {
            const saved = localStorage.getItem('oneCrewMyTeam');
            return saved ? JSON.parse(saved) : [
                MOCK_PROFILES[0], // Aya Mahmoud (Actor)
                MOCK_PROFILES[1], // Karim Adel (Voice Actor)
                MOCK_PROFILES[2], // Salma Ibrahim (Theater Actress)
                MOCK_PROFILES[3], // Omar Hassan (Stunt Coordinator)
                MOCK_PROFILES[4], // Layla El-Masry (Creative Director)
                MOCK_PROFILES[5], // Ahmed Zaki (DOP)
                MOCK_COMPANIES[0], // Aroma (Post House)
                MOCK_COMPANIES[2], // Shift Studio (Post House)
                MOCK_COMPANIES[8], // Tarek Nour (Agency)
                MOCK_COMPANIES[10], // Leo Burnett Cairo (Agency)
                MOCK_COMPANIES[12], // Orca Production (Production House)
                MOCK_COMPANIES[14], // Lighthouse Films (Production House)
                MOCK_COMPANIES[19], // The Garage (Sound Studio)
                MOCK_COMPANIES[20], // The Casting Hub (Casting Studio)
            ];
        } catch (e) {
            console.error("Failed to load myTeam from localStorage", e);
            return [
                MOCK_PROFILES[0], MOCK_PROFILES[1], MOCK_PROFILES[2], MOCK_PROFILES[3],
                MOCK_PROFILES[4], MOCK_PROFILES[5], MOCK_COMPANIES[0], MOCK_COMPANIES[2],
                MOCK_COMPANIES[8], MOCK_COMPANIES[10], MOCK_COMPANIES[12], MOCK_COMPANIES[14],
                MOCK_COMPANIES[19], MOCK_COMPANIES[20]
            ];
        }
    });
    const [theme, setTheme] = useState(() => localStorage.getItem('oneCrewTheme') || 'light');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [storeSelectedType, setStoreSelectedType] = useState(null);
    const [language, setLanguage] = useState(() => localStorage.getItem('oneCrewLanguage') || 'en');
    const [taskLists, setTaskLists] = useState([
        {
            id: 1,
            searchQuery: '',
            bars: [{ id: Date.now(), selectedMember: null, selectedService: null, isCombined: false }],
            isMenuOpen: false,
            showDates: false,
            startDate: null,
            endDate: null,
            isCollapsed: true,
            isNameConfirmed: false,
            showProgress: false,
            status: 'Pending',
        }
    ]);
    const [selectedCountry, setSelectedCountry] = useState('Egypt');
    const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [selectedAppColor, setSelectedAppColor] = useState(() => localStorage.getItem('oneCrewAppColor') || '#000000');
    const [castMembers, setCastMembers] = useState(() => {
        try {
            const saved = localStorage.getItem('oneCrewCastMembers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load cast members from localStorage", e);
            return [];
        }
    });
    const [deletedHeroes, setDeletedHeroes] = useState(() => {
        try {
            const saved = localStorage.getItem('oneCrewDeletedHeroes');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load deleted heroes from localStorage", e);
            return [];
        }
    });

    const toggleTheme = () => {
        setTheme(current => (current === 'light' ? 'dark' : 'light'));
    };

    useEffect(() => {
        localStorage.setItem('oneCrewTheme', theme);
    }, [theme]);
    
    useEffect(() => {
        localStorage.setItem('oneCrewLanguage', language);
    }, [language]);
    
    useEffect(() => {
        localStorage.setItem('oneCrewAppColor', selectedAppColor);
    }, [selectedAppColor]);
    
    useEffect(() => {
        try {
            localStorage.setItem('oneCrewMyTeam', JSON.stringify(myTeam));
        } catch (e) {
            console.error("Failed to save myTeam to localStorage", e);
        }
    }, [myTeam]);
    
    useEffect(() => {
        try {
            localStorage.setItem('oneCrewAgenda', JSON.stringify(agenda));
        } catch (e) {
            console.error("Failed to save agenda to localStorage", e);
        }
    }, [agenda]);
    
    useEffect(() => {
        try {
            localStorage.setItem('oneCrewBookingRequests', JSON.stringify(bookingRequests));
        } catch (e) {
            console.error("Failed to save booking requests to localStorage", e);
        }
    }, [bookingRequests]);

    useEffect(() => {
        try {
            localStorage.setItem('oneCrewProjects', JSON.stringify(projects));
        } catch (error) {
            console.error("Could not save projects to localStorage", error);
        }
    }, [projects]);

    useEffect(() => {
        try {
            localStorage.setItem('oneCrewDreamProjects', JSON.stringify(dreamProjects));
        } catch (error) {
            console.error("Could not save dream projects to localStorage", error);
        }
    }, [dreamProjects]);

    useEffect(() => {
        try {
            localStorage.setItem('oneCrewCastMembers', JSON.stringify(castMembers));
        } catch (e) {
            console.error("Failed to save cast members to localStorage", e);
        }
    }, [castMembers]);

    useEffect(() => {
        try {
            localStorage.setItem('oneCrewDeletedHeroes', JSON.stringify(deletedHeroes));
        } catch (e) {
            console.error("Failed to save deleted heroes to localStorage", e);
        }
    }, [deletedHeroes]);

    useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
          /* Hide scrollbars for all elements */
          ::-webkit-scrollbar {
            display: none;
          }
          * {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          .range-slider {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            background: transparent;
            position: absolute;
            top: 2px;
            left: 0;
            pointer-events: none;
          }
          .range-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: #000; cursor: pointer; border-radius: 50%; border: 3px solid #fff; pointer-events: auto; }
          .range-slider::-moz-range-thumb { width: 18px; height: 18px; background: #000; cursor: pointer; border-radius: 50%; border: 3px solid #fff; pointer-events: auto; }
          .dark .range-slider::-webkit-slider-thumb { background: #fff; border-color: #000; }
          .dark .range-slider::-moz-range-thumb { background: #fff; border-color: #000; }
        `;
        document.head.appendChild(style);
        return () => { document.head.removeChild(style); };
    }, []);

    const navigateTo = (pageName, data = null) => {
        const newPage = { name: pageName, data };
        setHistory(prevHistory => [...prevHistory, newPage]);
        if (pageName !== 'home') {
            setTab('');
        }
    };

    const handleSplashFinished = () => {
        setShowSplash(false);
    };

    const handleUpdateHero = (updatedHero) => {
        setCastMembers(prev => 
            prev.map(member => 
                member.id === updatedHero.id ? updatedHero : member
            )
        );
        // Also, when a hero is updated, we need to update the history item so the data is fresh if we navigate back and forth.
        setHistory(prev => {
            const newHistory = [...prev];
            const currentPageIndex = newHistory.findIndex(p => p.name === 'heroDetail' && p.data.hero && p.data.hero.id === updatedHero.id);
            if (currentPageIndex > -1) {
                newHistory[currentPageIndex] = { 
                    ...newHistory[currentPageIndex],
                    data: { ...newHistory[currentPageIndex].data, hero: updatedHero }
                };
            }
            return newHistory;
        });
    };


    const handleLogin = () => {
        setUser({ name: 'GUST' }); // Mock login
        // Go back to the page before auth, or go home
        setHistory(prev => {
            const historyWithoutAuth = prev.filter(p => p.name !== 'auth');
            if (historyWithoutAuth.length > 0) {
                const lastPage = historyWithoutAuth[historyWithoutAuth.length - 1];
                 const tabPages = ["home", "projects", "spot", "profile", "star"];
                if(tabPages.includes(lastPage.name)){
                    setTab(lastPage.name);
                }
                return historyWithoutAuth;
            }
            setTab('spot');
            return [{ name: 'spot', data: null }]; // Fallback to home
        });
    };

    const handleBookingResponse = (requestId, status) => {
        const request = bookingRequests.find(r => r.id === requestId);
        if (!request) return;

        // If accepted, add to agenda
        if (status === 'accepted' || status === 'accepted-agenda') {
            const dateStrPart = request.dates.split(' - ')[0];
            const yearPartMatch = request.dates.match(/(\d{4})/);
            const yearPart = yearPartMatch ? yearPartMatch[0] : new Date().getFullYear();
            const fullDateStr = `${dateStrPart}, ${yearPart}`;
            const eventDate = new Date(fullDateStr);

            if (!isNaN(eventDate.getTime())) {
                const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
                const dayAbbr = dayMap[eventDate.getDay()];

                let inTime = '', outTime = '';
                if (request.hours) {
                    const times = request.hours.split(' - ');
                    const convertTo24Hour = (time12h) => {
                        if (!time12h) return '';
                        const [time, modifier] = time12h.split(' ');
                        let [hours, minutes] = time.split(':');
                        if (hours === '12') hours = '00';
                        if (modifier.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
                        return `${String(hours).padStart(2, '0')}:${minutes}`;
                    };
                    inTime = convertTo24Hour(times[0]);
                    outTime = convertTo24Hour(times[1]);
                }
            }
        }
        
        // Update the status of the request instead of removing it
        setBookingRequests(current => 
            current.map(r => r.id === requestId ? { ...r, status: status } : r)
        );
    };

    const handleServiceSelect = (serviceData, sectionKey) => {
        if (sectionKey === 'academy') {
            navigateTo('academyDetail', serviceData);
        } else if (sectionKey === 'legal') {
            navigateTo('legalDetail', serviceData);
        } else {
            navigateTo('details', serviceData);
        }
    };

    const handleProfileSelect = (profileData) => {
        navigateTo('profile', profileData);
    };

    const handleCompanySelect = (companyData) => {
        navigateTo('companyDetail', companyData);
    };

    const handleProjectSelect = (projectData) => {
        const project = projects.find(p => p.id === projectData.id);
        navigateTo('projectDetail', project);
    };

    const handleAddNewProject = () => {
        navigateTo('newProject', null);
    };

    const handleAddNewProjectEasy = () => {
        navigateTo('newProjectEasy', null);
    };

    const handleCreateDreamProject = (project) => {
        navigateTo('newProjectEasy', project);
    };

    const handleUpdateDreamProject = (updatedProject) => {
        setDreamProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        setHistory(prev => {
            const newHistory = [...prev];
            const pageIndex = newHistory.findIndex(p => p.name === 'newProjectEasy' && p.data?.id === updatedProject.id);
            if (pageIndex > -1) {
                newHistory[pageIndex] = { ...newHistory[pageIndex], data: updatedProject };
            }
            return newHistory;
        });
    };

    const handleCreateProject = ({ title, description, startDate, endDate, deliveryDate, type = "Film", team = [], tasks = [] }) => {
        const newProject = {
            id: Date.now(),
            title,
            description,
            type: type,
            status: "Pre-Production",
            progress: 0,
            tasks: tasks && tasks.length > 0 ? tasks : (team.length > 0 ? [{
                id: Date.now() + 1,
                title: "Assembled Team",
                service: "Crew",
                timeline: "",
                assigned: team,
                status: "Pending",
                services: team.map(t => t.specialty)
            }] : []),
            startDate,
            endDate,
            deliveryDate,
        };
        // Add the new project to the beginning of the list
        setProjects(prev => [newProject, ...prev]);
        
        // After creating, navigate back to the projects list.
        setHistory(prev => {
            const lastPageIndex = prev.length - 1;
            // Check if the current page is a project creation page
            if (prev[lastPageIndex].name === 'newProject' || prev[lastPageIndex].name === 'newProjectEasy') {
                // This removes the creation page from history, returning to the projects page.
                return prev.slice(0, lastPageIndex);
            }
            // Fallback: If creation is triggered from an unexpected page, just go to projects.
            return [{ name: 'projects', data: null }];
        });
        // Ensure the 'Projects' tab is active
        setTab('projects');
    };

    const handleUpdateProject = (updatedProject) => {
        setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
        setHistory(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1] = { ...newHistory[newHistory.length - 1], data: updatedProject };
            return newHistory;
        });
    };

    const handleCourseSelect = (courseData) => {
        navigateTo('courseDetail', courseData);
    };

    const handleProductSelect = (productData) => {
        navigateTo('productDetail', productData);
    };

    const handleAddToTeam = (profile) => {
        setMyTeam(currentTeam => {
            const isAdded = currentTeam.some(m => m.id === profile.id);
            if (isAdded) {
                return currentTeam.filter(m => m.id !== profile.id);
            } else {
                return [...currentTeam, profile];
            }
        });
    };

    const handleAssignToProject = (profile) => {
        setAssignModalOpen(true);
    };

    const handleStartChat = (profile) => {
        navigateTo('chat', profile);
    };

    const handleMediaSelect = (media) => {
        setSelectedMedia(media);
    };

    const handleNavigate = (pageName, data = null) => {
        navigateTo(pageName, data);
    }

    const handleTabChange = (newTab) => {
        setTab(newTab);
        setSearchQuery('');
        
        if (newTab === 'store') {
            setStoreSelectedType(null);
        }

        let rootPage;
        if (newTab === 'profile') {
            rootPage = { name: 'myProfile', data: MOCK_PROFILES[0] };
        } else if (newTab === 'star') {
            rootPage = { name: 'star', data: MOCK_PROFILES[4] }; // Using Layla El-Masry's profile as the "Star"
        } else {
            rootPage = { name: newTab, data: null };
        }
        setHistory([rootPage]);
    };

    const handleBack = () => {
        setHistory(prevHistory => {
            if (prevHistory.length > 1) {
                const newHistory = prevHistory.slice(0, -1);
                const newCurrentPage = newHistory[newHistory.length - 1];
                const tabPages = ["home", "projects", "spot", "profile", "star", "wall"];
                if (tabPages.includes(newCurrentPage.name)) {
                    setTab(newCurrentPage.name);
                } else if (newCurrentPage.name === 'myProfile') {
                    setTab('profile');
                } else {
                    setTab('');
                }
                return newHistory;
            } else if (prevHistory.length === 1 && prevHistory[0].name === 'ctPage') {
                // Special case to navigate to projects page from ctPage when it's the root
                setTab('projects');
                return [{ name: 'projects', data: null }];
            }
            return prevHistory;
        });
    };

    const renderContent = () => {
        if (showSplash) {
            return <LogoSplashScreen onFinished={handleSplashFinished} />;
        }
        
        // Old auth flow is now bypassed, app enters directly as a guest.
        // if (authState === 'splash') {
        //     return <SplashScreen onGuest={handleGuest} onUser={() => setAuthState('auth')} />;
        // }
        // if (authState === 'auth') {
        //     return <AuthPage onLogin={handleLogin} onBack={() => setAuthState('splash')} />;
        // }

        return (
            <div className="h-full w-full bg-zinc-50 dark:bg-black flex flex-col relative">
                {isCountryPickerOpen && <div className="absolute inset-0 z-40" onClick={() => setIsCountryPickerOpen(false)}></div>}
                <div className="w-full h-12 bg-black border-b-2 border-zinc-700 flex-shrink-0 flex items-center justify-between px-3">
                    { page.name !== 'auth' && (
                        <>
                            {/* Left: Settings Icon & Title */}
                            <div className="flex items-center">
                                <motion.button
                                    onClick={() => navigateTo('settings')}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 text-zinc-200 rounded-full hover:bg-zinc-800"
                                    aria-label="Open Settings"
                                >
                                    <Settings className="w-5 h-5" />
                                </motion.button>
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white text-sm font-semibold"
                                >
                                    One Crew, <span className="font-normal">{user.name}</span>
                                </motion.div>
                            </div>
                            
                            {/* Right: Other Icons */}
                            <div className="flex items-center gap-2 justify-end">
                                <motion.button
                                    onClick={() => setIsCountryPickerOpen(prev => !prev)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-1.5 relative text-zinc-200 rounded-full hover:bg-zinc-800"
                                    aria-label="Select Country"
                                >
                                    <span className="text-2xl w-6 h-6 flex items-center justify-center">{COUNTRIES[selectedCountry]}</span>
                                </motion.button>
                                <motion.button
                                    onClick={() => navigateTo('inbox')}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 relative text-zinc-200 rounded-full hover:bg-zinc-800"
                                    aria-label="Open Inbox"
                                >
                                    <MessageCircleIcon className="w-5 h-5" />
                                </motion.button>
                                <motion.button
                                    onClick={() => navigateTo('notifications')}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="p-2 relative text-zinc-200 rounded-full hover:bg-zinc-800"
                                    aria-label="Open Notifications"
                                >
                                    <Bell className="w-5 h-5" />
                                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-black" />
                                </motion.button>
                            </div>
                        </>
                    )}
                </div>
                <div className="flex-1 flex flex-col overflow-y-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={page.name + (page.data?.id || page.data?.label || '')}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="h-full w-full flex flex-col"
                        >
                            {page.name === 'home' && <HomePage onServiceSelect={handleServiceSelect} onOpenFilter={() => setAdvancedFilterOpen(true)} searchQuery={searchQuery} onSearchChange={setSearchQuery} onToggleTheme={toggleTheme} theme={theme} onNavigate={handleNavigate} user={user} onOpenMainMenu={() => navigateTo('settings')} />}
                            {page.name === 'sectionServices' && <SectionServicesPage section={page.data} onBack={handleBack} onServiceSelect={handleServiceSelect} />}
                            {page.name === 'details' && <ServiceDetailPage service={page.data} onBack={handleBack} onProfileSelect={handleProfileSelect} onCompanySelect={handleCompanySelect} onAddToTeam={handleAddToTeam} onAssignToProject={handleAssignToProject} myTeam={myTeam} />}
                            {page.name === 'academyDetail' && <AcademyDetailPage service={page.data} onBack={handleBack} onCourseSelect={handleCourseSelect} />}
                            {page.name === 'legalDetail' && <LegalServiceDetailPage service={page.data} onBack={handleBack} />}
                            {page.name === 'profile' && <StarPage profile={page.data} onBack={handleBack} onAssignToProject={handleAssignToProject} onAddToTeam={handleAddToTeam} myTeam={myTeam} onStartChat={handleStartChat} onMediaSelect={handleMediaSelect} />}
                            {page.name === 'myProfile' && <StarPage profile={MOCK_PROFILES[0]} onBack={handleBack} onAssignToProject={handleAssignToProject} onAddToTeam={handleAddToTeam} myTeam={myTeam} onStartChat={handleStartChat} onMediaSelect={handleMediaSelect} isCurrentUser={true} />}
                            {page.name === 'companyDetail' && <CompanyDetailPage company={page.data} onBack={handleBack} onAssignToProject={handleAssignToProject} onAddToTeam={handleAddToTeam} myTeam={myTeam} onStartChat={handleStartChat} onMediaSelect={handleMediaSelect} />}
                            {page.name === 'projects' && <ProjectsPage projects={projects} onProjectSelect={handleProjectSelect} searchQuery={searchQuery} onSearchChange={setSearchQuery} onBack={handleBack} onCreateDreamProject={handleCreateDreamProject} dreamProjects={dreamProjects} setDreamProjects={setDreamProjects} />}
                            {page.name === 'projectDetail' && <ProjectDetailPage project={page.data} onBack={handleBack} onUpdateProject={handleUpdateProject} onNavigate={handleNavigate} />}
                            {page.name === 'newProject' && <NewProjectPage onBack={handleBack} onCreate={handleCreateProject} />}
                            {page.name === 'newProjectEasy' && <NewProjectEasyModePage projects={projects} onBack={handleBack} onCreate={handleCreateProject} myTeam={myTeam} onNavigateToCrewTab={() => handleTabChange('home')} taskLists={taskLists} setTaskLists={setTaskLists} onProfileSelect={handleProfileSelect} onNavigate={navigateTo} dreamProject={page.data} onUpdateDreamProject={handleUpdateDreamProject} castMembers={castMembers} />}
                            {page.name === 'myTeam' && <MyTeamPage myTeam={myTeam} onProfileSelect={handleProfileSelect} onCompanySelect={handleCompanySelect} searchQuery={searchQuery} onSearchChange={setSearchQuery} onBack={handleBack} />}
                            {page.name === 'inbox' && <InboxPage conversations={MOCK_CONVERSATIONS} onConversationSelect={handleStartChat} onBack={handleBack} />}
                            {page.name === 'chat' && <ChatPage profile={page.data} onBack={handleBack} />}
                            {page.name === 'store' && <StorePage searchQuery={searchQuery} onSearchChange={setSearchQuery} onOpenFilter={() => setStoreFilterOpen(true)} onBack={handleBack} onProductSelect={handleProductSelect} filter={storeFilter} onFilterChange={setStoreFilter} selectedType={storeSelectedType} onSelectType={setStoreSelectedType} />}
                            {page.name === 'courseDetail' && <CourseDetailPage course={page.data} onBack={handleBack} />}
                            {page.name === 'productDetail' && <ProductDetailPage product={page.data} onBack={handleBack} />}
                            {page.name === 'notifications' && <NotificationsPage onBack={handleBack} projects={projects} />}
                            {page.name === 'spot' && <SpotPage onBack={handleBack} onProfileSelect={handleProfileSelect} onCompanySelect={handleCompanySelect} />}
                            {page.name === 'star' && <StarPage profile={page.data} onBack={handleBack} onAssignToProject={handleAssignToProject} onAddToTeam={handleAddToTeam} myTeam={myTeam} onStartChat={handleStartChat} onMediaSelect={handleMediaSelect} isCurrentUser={false} />}
                            {page.name === 'settings' && <SettingsPage onBack={handleBack} onNavigate={handleNavigate} theme={theme} onToggleTheme={toggleTheme} selectedAppColor={selectedAppColor} onOpenColorPicker={() => setIsColorPickerOpen(true)} />}
                            {page.name === 'privacyPolicy' && <PrivacyPolicyPage onBack={handleBack} />}
                            {page.name === 'termsOfService' && <TermsOfServicePage onBack={handleBack} />}
                            {page.name === 'helpCenter' && <HelpCenterPage onBack={handleBack} />}
                            {page.name === 'chatWithUs' && <ChatWithUsPage onBack={handleBack} />}
                            {page.name === 'changeLanguage' && <ChangeLanguagePage onBack={handleBack} currentLanguage={language} onSelectLanguage={setLanguage} />}
                            {page.name === 'auth' && <AuthPage onLogin={handleLogin} onBack={handleBack} />}
                            {page.name === 'wall' && <AgendaPage onBack={handleBack} agenda={agenda} setAgenda={setAgenda} myTeam={myTeam} onProfileSelect={handleProfileSelect} onNavigate={navigateTo} bookingRequestCount={bookingRequests.length} />}
                            {page.name === 'allAgenda' && <AllAgendaPage onBack={handleBack} onNavigate={navigateTo} agenda={agenda} onProfileSelect={handleProfileSelect} />}
                            {page.name === 'bookingRequests' && <BookingRequestsPage onBack={handleBack} onNavigate={navigateTo} projects={projects} requests={bookingRequests} onRespond={handleBookingResponse} />}
                            {page.name === 'projectBudget' && <ProjectBudgetPage onBack={handleBack} project={page.data} />}
                            {page.name === 'shootingTable' && <ShootingTablePage onBack={handleBack} project={page.data} />}
                            {page.name === 'sPage' && <SPage onBack={handleBack} onNavigate={navigateTo} />}
                            {page.name === 'ctPage' && <CTPage onBack={handleBack} onNavigate={navigateTo} castMembers={castMembers} setCastMembers={setCastMembers} project={page.data} deletedHeroes={deletedHeroes} setDeletedHeroes={setDeletedHeroes} />}
                            {page.name === 'heroDetail' && <HeroDetailPage hero={page.data.hero} project={page.data.project} onBack={handleBack} myTeam={myTeam} onUpdateHero={handleUpdateHero} onNavigate={navigateTo} taskLists={taskLists} setTaskLists={setTaskLists} />}
                        </motion.div>
                    </AnimatePresence>
                </div>
                <footer className="border-t border-zinc-200 dark:border-zinc-800">
                    <TabBar active={tab} onChange={handleTabChange} />
                </footer>
                <AnimatePresence>
                    {(history.length > 1 || page.name === 'ctPage') && (
                        <motion.button
                            onClick={handleBack}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute bottom-20 left-4 z-20 bg-black/80 dark:bg-white/80 text-white dark:text-black p-3 rounded-full backdrop-blur-sm shadow-lg border-2 border-white/20 dark:border-black/20"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </motion.button>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                    {isCountryPickerOpen && (
                        <CountryPicker
                            onClose={() => setIsCountryPickerOpen(false)}
                            selectedValue={selectedCountry}
                            onSelect={(country) => {
                                setSelectedCountry(country);
                                setIsCountryPickerOpen(false);
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-zinc-100 text-zinc-900">
            <div className="mx-auto max-w-6xl px-4">
                <div className="py-4 md:py-6 flex items-center justify-between">
                    <h1 className="text-xl md:text-2xl font-semibold">One Crew – App</h1>
                    <div className="text-[12px] text-zinc-500">v14.4 • Enhanced UX</div>
                </div>
                <DeviceFrame theme={theme}>
                    {renderContent()}
                </DeviceFrame>
            </div>
            <AdvancedFilterModal 
                open={advancedFilterOpen} 
                onClose={() => setAdvancedFilterOpen(false)} 
                onApply={setAdvancedFilter}
                currentFilters={advancedFilter}
            />
            <StoreAdvancedFilterModal isOpen={storeFilterOpen} onClose={() => setStoreFilterOpen(false)} onApply={setStoreFilter} currentFilters={storeFilter} />
            <AssignToProjectModal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} onAssign={() => setAssignModalOpen(false)} onAddNewProject={() => { setAssignModalOpen(false); handleAddNewProject(); }} projects={projects} />
            <AnimatePresence>
                {selectedMedia?.type === 'image' && (
                    <ImageLightbox images={MOCK_GALLERY_IMAGES} startIndex={selectedMedia.index} onClose={() => setSelectedMedia(null)} />
                )}
                {selectedMedia?.type === 'video' && (
                    <VideoPlayerModal video={selectedMedia.data} onClose={() => setSelectedMedia(null)} />
                )}
                {selectedMedia?.type === 'audio' && (
                    <AudioPlayerModal audio={selectedMedia.data} onClose={() => setSelectedMedia(null)} />
                )}
            </AnimatePresence>
            <ColorPickerModal
                isOpen={isColorPickerOpen}
                onClose={() => setIsColorPickerOpen(false)}
                onSelect={setSelectedAppColor}
                currentColor={selectedAppColor}
            />
        </div>
    );
};

export default App;