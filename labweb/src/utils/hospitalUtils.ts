// Generate MR number. If existingSerial is provided, reuse it to preserve patient serial across departments.
export function generateMRNumber(department: string, existingSerial?: string): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const deptCode = department.substring(0, 3).toUpperCase();

  const key = `mrCounter-${year}${month}`;
  let counter = localStorage.getItem(key);
  let serial = 1;

  // If a serial was provided (existing patient), just reuse it
  if (existingSerial) {
    serial = parseInt(existingSerial);
  }

  if (!existingSerial && counter) {
    serial = parseInt(counter) + 1;
  }

  localStorage.setItem(key, serial.toString());

  const hospitalCode = localStorage.getItem('hospitalCode') || 'SAFH';
  return `${hospitalCode}/${deptCode}/${year}/${month}/${serial.toString().padStart(4, '0')}`;
};

// Generate the next token number, always starting from 1 after midnight
export const generateTokenNumber = (): string => {
  const now = new Date();
  const today = now.toDateString();

  // Get last reset date and current counter
  const lastTokenDate = localStorage.getItem('lastTokenDate');
  let tokenCounter = parseInt(localStorage.getItem('dailyTokenCounter') || '1');

  // If it's a new day, reset the counter to 1 (never 0)
  if (lastTokenDate !== today) {
    tokenCounter = 1;
    localStorage.setItem('dailyTokenCounter', '2'); // Next token will be 2 after this one
    localStorage.setItem('lastTokenDate', today);
  } else {
    // Increment and save counter for the next call
    localStorage.setItem('dailyTokenCounter', (tokenCounter + 1).toString());
  }

  const paddedToken = String(tokenCounter).padStart(3, '0');
  return paddedToken;
};

// Function to check and reset token counter at midnight
// Check and reset the daily token counter at midnight. Always reset to 1 (never 0).
export const checkAndResetDailyToken = (): void => {
  const now = new Date();
  const today = now.toDateString();
  const lastTokenDate = localStorage.getItem('lastTokenDate');

  if (lastTokenDate !== today) {
    localStorage.setItem('dailyTokenCounter', '1');
    localStorage.setItem('lastTokenDate', today);
  }
};

// Schedule daily token reset at midnight
export const scheduleDailyTokenReset = (): void => {
  // Clear any previous timer if running in SPA
  if ((window as any)._tokenResetTimeout) {
    clearTimeout((window as any)._tokenResetTimeout);
  }
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  const msUntilMidnight = nextMidnight.getTime() - now.getTime();
  (window as any)._tokenResetTimeout = setTimeout(() => {
    checkAndResetDailyToken();
    // Schedule next reset every 24 hours
    setInterval(checkAndResetDailyToken, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);
};

// Function to check and reset MR counter for new year
export const checkAndResetYearlyMR = (): void => {
  const now = new Date();
  const currentYear = now.getFullYear().toString();
  const lastMRYear = localStorage.getItem('lastMRYear');
  
  if (lastMRYear !== currentYear) {
    localStorage.setItem(`mrCounter_${currentYear}`, '1');
    localStorage.setItem('lastMRYear', currentYear);
  }
};

export const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};
