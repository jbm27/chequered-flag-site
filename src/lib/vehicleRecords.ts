// Year of manufacture and odometer for each vehicle, from Homer's fleet dashboard (V1.5).
// Desk only: read by the staff API after sign-in, never by the public pages.
// Read-only for now. Editing these needs somewhere to save them, which is for James to approve.

export const VEHICLE_RECORDS: Record<string, { year: number | null; km: number | null }> = {
  v1: { year: 2008, km: 249359 }, // KCF 426V
  v2: { year: 2009, km: 235498 }, // KCH 310S
  v3: { year: 2009, km: 275470 }, // KCJ 416Z
  v4: { year: 2008, km: 244453 }, // KCJ 442Z
  v5: { year: 2010, km: 211628 }, // KCP 806X
  v6: { year: 2011, km: 206652 }, // KCQ 209B
  v7: { year: 2011, km: 166538 }, // KCT 932A
  v8: { year: 2012, km: 189463 }, // KCX 765J
  v9: { year: 2012, km: 160774 }, // KCX 776J
  v10: { year: 2014, km: 76061 }, // KDG 235D
  v11: { year: 2009, km: 200015 }, // KCJ 394G
  v12: { year: 2004, km: 282655 }, // KBR 166E
  v13: { year: 2005, km: 254534 }, // KBS 446X
  v14: { year: 2005, km: 256235 }, // KBU 602S
  v15: { year: 2006, km: 251046 }, // KBW 597Z
  v16: { year: 2008, km: 177785 }, // KCC 985R
  v17: { year: 2008, km: 222238 }, // KCC 874Y
  v18: { year: 2008, km: 192651 }, // KCE 254P
  v19: { year: 2008, km: 162739 }, // KCF 964M
  v21: { year: 2008, km: 208696 }, // KCD 327C
  v22: { year: 2011, km: 167537 }, // KCS 356S
  v24: { year: 2004, km: 345155 }, // KBP 406F
  v25: { year: 2006, km: 222937 }, // KBW 212C
  v26: { year: 2007, km: 207273 }, // KCB 722E
  v27: { year: 2007, km: 175008 }, // KCB 749H
  v28: { year: 2009, km: 161418 }, // KCE 404B
  v29: { year: 2008, km: 223023 }, // KCC 833T
  v30: { year: 2006, km: 129599 }, // KBW 554A
  v31: { year: 2008, km: 152287 }, // KCE 132P
  v33: { year: 2004, km: 229198 }, // KAU 675F
};
