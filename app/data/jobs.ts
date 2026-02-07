export interface Job {
  id: number;
  title: string;
  company: string;
  logo: string;
  location: string;
  contract: string;
  salary: string;
  experience: string;
  date: string;
  description: string;
  requirements: string[];
  benefits: string[];
  companyDescription: string;
  distance?: number;
  tags?: string[];
}

export const jobsData: Record<number, Job> = {
  1: {
    id: 1,
    title: "UX/UI Designer",
    company: "Google Italy",
    logo: "G",
    location: "Milano, IT · 12 km",
    contract: "Full-time",
    salary: "40.000 - 55.000€",
    experience: "3-5 anni",
    date: "28 Gennaio 2026",
    description: `<p>Google Italy sta cercando un <strong>UX/UI Designer</strong> creativo e orientato all'utente per unirsi al nostro team di design di prodotto a Milano.</p>
      <p>In questo ruolo, lavorerai su progetti che impattano milioni di utenti in tutto il mondo, collaborando con team multidisciplinari per creare esperienze digitali intuitive e coinvolgenti.</p>
      <p>Avrai l'opportunità di lavorare sulle ultime tecnologie e strumenti di design, contribuendo all'evoluzione dei prodotti Google.</p>`,
    requirements: [
      "Laurea in Design, HCI o esperienza equivalente",
      "3-5 anni di esperienza come UX/UI Designer",
      "Portfolio eccellente che dimostri capacità di design centrato sull'utente",
      "Padronanza di Figma, Sketch, Adobe XD e strumenti di prototipazione",
      "Forte comprensione dei principi di usabilità e accessibilità",
      "Esperienza nella conduzione di ricerca utente e test di usabilità",
      "Eccellenti capacità di comunicazione e collaborazione",
      "Conoscenza base di HTML/CSS è un plus"
    ],
    benefits: [
      "Retribuzione competitiva e pacchetto di benefit completo",
      "Ambiente di lavoro innovativo negli uffici Google di Milano",
      "Flessibilità di orario e possibilità di smart working",
      "Budget per formazione, conferenze e sviluppo professionale",
      "Mensa aziendale gratuita e snack illimitati",
      "Palestra aziendale e programmi di benessere",
      "Opportunità di lavorare su prodotti usati da miliardi di persone",
      "Cultura aziendale inclusiva e team building regolari"
    ],
    companyDescription: "Google è un'azienda tecnologica globale specializzata in servizi e prodotti legati a Internet, tra cui ricerca online, pubblicità, cloud computing, software e hardware. Con uffici in tutto il mondo, Google Italia rappresenta un hub di innovazione nel cuore di Milano, dove team multiculturali lavorano insieme per creare prodotti che migliorano la vita di milioni di persone.",
    distance: 12,
    tags: ["Figma", "Sketch", "prototyping"]
  },
  2: {
    id: 2,
    title: "Backend Engineer",
    company: "Microsoft",
    logo: "M",
    location: "Torino, IT · 5 km",
    contract: "Full-time",
    salary: "50.000 - 70.000€",
    experience: "5+ anni",
    date: "26 Gennaio 2026",
    description: `<p>Microsoft Italia è alla ricerca di un <strong>Backend Engineer</strong> esperto per il nostro centro di sviluppo a Torino.</p>
      <p>Lavorerai su sistemi cloud scalabili e ad alte prestazioni, contribuendo allo sviluppo di servizi Azure utilizzati da milioni di aziende in tutto il mondo.</p>
      <p>Questa è un'opportunità unica per lavorare con tecnologie all'avanguardia e fare la differenza nell'ecosistema Microsoft.</p>`,
    requirements: [
      "Laurea in Informatica, Ingegneria o esperienza equivalente",
      "5+ anni di esperienza nello sviluppo backend",
      "Eccellente conoscenza di C#, .NET Core e ASP.NET",
      "Esperienza con Azure Cloud Services (App Services, Functions, Storage)",
      "Padronanza di SQL Server e/o database NoSQL",
      "Conoscenza di architetture microservizi e API RESTful",
      "Esperienza con Docker, Kubernetes e CI/CD",
      "Ottime capacità di problem-solving e lavoro in team"
    ],
    benefits: [
      "Retribuzione altamente competitiva e bonus annuale",
      "Lavoro ibrido con flessibilità di orario",
      "Pacchetto assicurativo completo per te e la tua famiglia",
      "Budget generoso per formazione e certificazioni Microsoft",
      "Accesso a tutte le tecnologie e strumenti Microsoft",
      "Programma di stock options per dipendenti",
      "Uffici moderni con aree relax e gaming",
      "Percorso di crescita professionale chiaro e supportato"
    ],
    companyDescription: "Microsoft è leader mondiale nel software, nei servizi, nei dispositivi e nelle soluzioni che aiutano persone e aziende a realizzare il loro pieno potenziale. Con una presenza globale e un impegno costante per l'innovazione, Microsoft Italia offre un ambiente di lavoro dinamico dove la creatività e la collaborazione sono al centro di tutto ciò che facciamo.",
    distance: 5,
    tags: ["C#", ".NET", "Azure"]
  },
  3: {
    id: 3,
    title: "Project Manager",
    company: "Amazon",
    logo: "A",
    location: "Milano, IT · 25 km",
    contract: "Full-time",
    salary: "45.000 - 65.000€",
    experience: "5+ anni",
    date: "24 Gennaio 2026",
    description: `<p>Amazon Italia cerca un <strong>Project Manager</strong> esperto per guidare progetti complessi nel nostro hub logistico e tecnologico di Milano.</p>
      <p>Sarai responsabile della pianificazione, esecuzione e monitoraggio di progetti che migliorano l'esperienza cliente e l'efficienza operativa.</p>
      <p>Questa posizione offre l'opportunità di lavorare in un ambiente dinamico e in rapida evoluzione, con impatto diretto sul business.</p>`,
    requirements: [
      "Laurea in Ingegneria, Business o campo correlato",
      "5+ anni di esperienza nella gestione progetti",
      "Certificazione PMP o equivalente (preferibile)",
      "Esperienza comprovata con metodologie Agile e Waterfall",
      "Eccellenti capacità di leadership e gestione stakeholder",
      "Forte orientamento ai risultati e al cliente",
      "Esperienza con strumenti di PM (Jira, MS Project, etc.)",
      "Inglese fluente"
    ],
    benefits: [
      "Retribuzione competitiva con bonus basati su performance",
      "Pacchetto benefit completo incluso assicurazione sanitaria",
      "Opportunità di crescita professionale e sviluppo carriera",
      "Ambiente di lavoro innovativo e collaborativo",
      "Accesso a programmi di formazione e certificazione",
      "Work-life balance con flessibilità di orario",
      "Sconti su prodotti Amazon e servizi",
      "Programmi di benessere aziendale"
    ],
    companyDescription: "Amazon è una delle aziende tecnologiche più innovative al mondo, con un focus su cliente, innovazione e operazioni eccellenti. In Italia, Amazon continua a crescere, offrendo opportunità uniche per professionisti che vogliono fare la differenza in un ambiente dinamico e orientato ai risultati.",
    distance: 25,
    tags: ["PMP certified", "5+ anni"]
  },
  4: {
    id: 4,
    title: "Content Creator",
    company: "Spotify",
    logo: "S",
    location: "Milano, IT · 18 km",
    contract: "Full-time",
    salary: "30.000 - 45.000€",
    experience: "2-4 anni",
    date: "22 Gennaio 2026",
    description: `<p>Spotify cerca un <strong>Content Creator</strong> creativo per il nostro team di marketing a Milano.</p>
      <p>Creerai contenuti coinvolgenti per i nostri canali social e piattaforme digitali, contribuendo a costruire la community Spotify in Italia.</p>`,
    requirements: [
      "Esperienza nella creazione di contenuti per social media",
      "Conoscenza di video editing e design grafico",
      "Creatività e capacità di storytelling",
      "Familiarità con le piattaforme social principali"
    ],
    benefits: [
      "Ambiente creativo e stimolante",
      "Accesso premium a Spotify",
      "Opportunità di crescita nel settore media"
    ],
    companyDescription: "Spotify è la piattaforma audio streaming leader mondiale.",
    distance: 18,
    tags: ["Video editing", "social media"]
  },
  5: {
    id: 5,
    title: "DevOps Engineer",
    company: "Netflix",
    logo: "N",
    location: "Roma, IT · 45 km",
    contract: "Full-time",
    salary: "55.000 - 75.000€",
    experience: "4+ anni",
    date: "20 Gennaio 2026",
    description: `<p>Netflix cerca un <strong>DevOps Engineer</strong> per il nostro team tecnico.</p>`,
    requirements: [
      "Esperienza con Kubernetes, Docker, CI/CD"
    ],
    benefits: [
      "Retribuzione competitiva",
      "Ambiente tecnologico all'avanguardia"
    ],
    companyDescription: "Netflix è leader mondiale nello streaming video.",
    distance: 45,
    tags: ["Kubernetes", "Docker", "CI/CD"]
  },
  6: {
    id: 6,
    title: "Sales Manager",
    company: "Tesla",
    logo: "T",
    location: "Torino, IT · 8 km",
    contract: "Full-time",
    salary: "40.000 - 60.000€",
    experience: "3+ anni",
    date: "18 Gennaio 2026",
    description: `<p>Tesla cerca un <strong>Sales Manager</strong> per il nostro team vendite.</p>`,
    requirements: [
      "Esperienza B2B, settore automotive"
    ],
    benefits: [
      "Retribuzione competitiva",
      "Opportunità di crescita"
    ],
    companyDescription: "Tesla è leader nella mobilità elettrica.",
    distance: 8,
    tags: ["B2B experience", "automotive"]
  }
};

export const getAllJobs = (): Job[] => {
  return Object.values(jobsData);
};

export const getJobById = (id: number): Job | undefined => {
  return jobsData[id];
};

