import axios from 'axios';

const API_BASE_URL = 'http://api.aladhan.com/v1';

export interface Location {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PrayerSettings {
  method: number; // calculation method
  school: number; // 0 = Shafi, 1 = Hanafi
  adjustments: {
    [key: string]: number; // minutes to adjust each prayer (before/after)
  };
  jamaatAdjustments: {
    [key: string]: number; // minutes to adjust each prayer (before/after)
  };
  location: Location;
}

export const searchLocations = async (query: string): Promise<Location[]> => {
  // Using a geocoding API (you might want to replace with your preferred one)
  const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
    params: {
      q: query,
      format: 'json',
      limit: 5
    }
  });

  return response.data.map((item: any) => ({
    city: item.display_name.split(',')[0],
    country: item.display_name.split(',').slice(-1)[0].trim(),
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon)
  }));
};

export const getPrayerTimes = async (settings: PrayerSettings, date: Date) => {
  const response = await axios.get(`${API_BASE_URL}/calendar`, {
    params: {
      latitude: settings.location.latitude,
      longitude: settings.location.longitude,
      method: settings.method,
      school: settings.school,
      month: date.getMonth() + 1,
      year: date.getFullYear()
    }
  });

  const timings = response.data.data[date.getDate() - 1].timings;
  const processedTimings: { [key: string]: string } = {};
  
  // Process each prayer time
  Object.keys(timings).forEach(prayer => {
    try {
      // Convert time string to Date object
      const [hours, minutes] = timings[prayer].split(' ')[0].split(':');
      const time = new Date();
      time.setHours(parseInt(hours, 10));
      time.setMinutes(parseInt(minutes, 10));
      time.setSeconds(0);
      time.setMilliseconds(0);

      // Apply adjustments if any
      if (settings.adjustments[prayer]) {
        time.setMinutes(time.getMinutes() + settings.adjustments[prayer]);
      }

      processedTimings[prayer] = time.toISOString();
    } catch (error) {
      console.error(`Error processing time for ${prayer}:`, error);
      processedTimings[prayer] = new Date().toISOString(); // Fallback to current time
    }
  });

  return processedTimings;
};
