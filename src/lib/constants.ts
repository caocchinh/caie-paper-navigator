export const CURRICULUMS = [
  {
    id: "cambridge-international-a-level",
    label: "Cambridge International A Level",
  },
  {
    id: "cambridge-igcse",
    label: "Cambridge IGCSE",
  },
] as const;

export const SUBJECTS = [
  {
    id: "chemistry-9701",
    code: "9701",
    label: "Chemistry",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "mathematics-9709",
    code: "9709",
    label: "Mathematics",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "computer-science-9618",
    code: "9618",
    label: "Computer Science",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "computer-science-9608",
    code: "9608",
    label: "Computer Science (Legacy)",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "biology-9700",
    code: "9700",
    label: "Biology",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "physics-9702",
    code: "9702",
    label: "Physics",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "economics-9708",
    code: "9708",
    label: "Economics",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "business-9609",
    code: "9609",
    label: "Business",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "psychology-9990",
    code: "9990",
    label: "Psychology",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "mathematics-further-9231",
    code: "9231",
    label: "Further Mathematics",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "computer-science-0478",
    code: "0478",
    label: "Computer Science",
    curriculum: "cambridge-igcse",
  },
  {
    id: "mathematics-0580",
    code: "0580",
    label: "Mathematics",
    curriculum: "cambridge-igcse",
  },
  {
    id: "sciences-co-ordinated-0654",
    code: "0654",
    label: "Sciences Co-ordinated",
    curriculum: "cambridge-igcse",
  },
  {
    id: "economics-0455",
    code: "0455",
    label: "Economics",
    curriculum: "cambridge-igcse",
  },
  {
    id: "business-studies-0450",
    code: "0450",
    label: "Business Studies",
    curriculum: "cambridge-igcse",
  },
  {
    id: "sociology-9699",
    code: "9699",
    label: "Sociology",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "sociology-9698",
    code: "9698",
    label: "Sociology (legacy)",
    curriculum: "cambridge-international-a-level",
  },
  {
    id: "media-studies-9607",
    code: "9607",
    label: "Media Studies",
    curriculum: "cambridge-international-a-level",
  },
] as const;

export const seasonS = [
  {
    id: "m",
    label: "F/M",
    fullName: "February/March",
  },
  {
    id: "s",
    label: "M/J",
    fullName: "May/June",
  },
  {
    id: "w",
    label: "O/N",
    fullName: "October/November",
  },
] as const;

export const PAPER_TYPES = [
  {
    id: "qp",
    label: "Question Paper",
  },
  {
    id: "ms",
    label: "Marking Scheme",
  },
] as const;

export type Curriculum = (typeof CURRICULUMS)[number]["id"];
export type Subject = (typeof SUBJECTS)[number];
export type season = (typeof seasonS)[number]["id"];
export type PaperType = (typeof PAPER_TYPES)[number]["id"];
