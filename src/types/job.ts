export type JobSource = 'relasi/teman' | 'keluarga' | 'dosen' | 'linked in' | 'grup WA' | 'website perusahaan' | 'glints' | 'jobstreet' | 'indeed' | 'mendapat sendiri di dunia nyata' | 'instagram' | 'twitter' | 'Threads by Instagram' | 'facebook' | 'referral' | 'dealls';
export type JobAppliedVia = 'email' | 'website perusahaan' | 'google form' | 'glints' | 'jobstreet' | 'linked in easy apply' | 'indeed' | 'ordal' | 'dikirim ke tempat' | 'dealls';
export type JobWorkSetup = 'WFO' | 'WFH' | 'Hybrid';

export const JOB_SOURCES: JobSource[] = ['relasi/teman', 'keluarga', 'dosen', 'linked in', 'grup WA', 'website perusahaan', 'glints', 'jobstreet', 'indeed', 'mendapat sendiri di dunia nyata', 'instagram', 'twitter', 'Threads by Instagram', 'facebook', 'referral', 'dealls'];
export const JOB_APPLIED_VIA: JobAppliedVia[] = ['email', 'website perusahaan', 'google form', 'glints', 'jobstreet', 'linked in easy apply', 'indeed', 'ordal', 'dikirim ke tempat', 'dealls'];
export const JOB_WORK_SETUPS: JobWorkSetup[] = ['WFO', 'WFH', 'Hybrid'];

export interface Job {
  id: string;
  userId: string;
  company: string;
  position: string;
  location: string;
  status: string;
  link: string;
  dateAdded: string;
  dateApplied?: string;
  description: string;
  source?: JobSource;
  appliedVia?: JobAppliedVia;
  salaryRange?: string;
  workSetup?: JobWorkSetup;
}
