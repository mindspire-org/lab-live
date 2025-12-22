export interface Doctor {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  department: string;
  isAvailable: boolean;
  availability: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  consultationFee: number;
  experience: number;
  bio: string;
  imageUrl?: string;
}
