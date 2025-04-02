import axios from 'axios';

const API_BASE_URL = 'https://api.aladhan.com/v1';

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

export const getUserLocation = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('আপনার ব্রাউজারে জিওলোকেশন সমর্থিত নয়'));
      return;
    }
    
    const timeoutError = setTimeout(() => {
      reject(new Error('অবস্থান সনাক্ত করতে সময় শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।'));
    }, 15000); // 15 seconds timeout
    
    navigator.geolocation.getCurrentPosition(
      position => {
        clearTimeout(timeoutError);
        resolve(position);
      },
      error => {
        clearTimeout(timeoutError);
        console.error('Geolocation error:', error);
        
        let errorMessage = 'অবস্থান সনাক্ত করতে ত্রুটি হয়েছে';
        
        switch(error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = 'অবস্থান অনুমতি অস্বীকার করা হয়েছে। অনুগ্রহ করে সঠিক নামাজ টাইমের জন্য আপনার ব্রাউজার সেটিংসে অবস্থান অ্যাক্সেস সক্ষম করুন।';
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = 'আপনার অবস্থান সনাক্ত করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন বা ম্যানুয়ালি আপনার শহর নির্বাচন করুন।';
            break;
          case 3: // TIMEOUT
            errorMessage = 'অবস্থান সনাক্ত করতে সময় শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
            break;
        }
        
        reject(new Error(errorMessage));
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, // 10 seconds
        maximumAge: 60000 // 1 minute
      }
    );
  });
};

export const searchLocations = async (query: string): Promise<Location[]> => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  
  try {
    // Using a geocoding API (you might want to replace with your preferred one)
    const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5
      },
      headers: {
        'User-Agent': 'ProMuslim-App/1.0', // Required by Nominatim ToS
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response from location search API:', response.data);
      return [];
    }

    return response.data.map((item: any) => ({
      city: item.display_name.split(',')[0],
      country: item.display_name.split(',').slice(-1)[0].trim(),
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Error searching locations:', error);
    throw new Error('অবস্থান অনুসন্ধান করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আপনার নেটওয়ার্ক সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।');
  }
};

export const reverseGeocode = async (lat: number, lon: number): Promise<Location> => {
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        lat,
        lon,
        format: 'json'
      },
      headers: {
        'User-Agent': 'ProMuslim-App/1.0', // Required by Nominatim ToS
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000 // 10 seconds timeout
    });

    const data = response.data;
    
    if (!data || !data.address) {
      throw new Error('Invalid response from geocoding API');
    }
    
    return {
      city: data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown',
      country: data.address.country || 'Unknown',
      latitude: lat,
      longitude: lon
    };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    // Return a default location with the coordinates
    return {
      city: 'Unknown',
      country: 'Unknown',
      latitude: lat,
      longitude: lon
    };
  }
};

export const getPrayerTimes = async (settings: PrayerSettings, date: Date) => {
  try {
    // Create a cache key based on the date and settings
    const cacheKey = `prayer_times_${date.toISOString().split('T')[0]}_${settings.location.latitude}_${settings.location.longitude}_${settings.method}_${settings.school}`;
    
    // Check if we have cached data
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    const response = await axios.get(`${API_BASE_URL}/calendar`, {
      params: {
        latitude: settings.location.latitude,
        longitude: settings.location.longitude,
        method: settings.method,
        school: settings.school,
        month: date.getMonth() + 1,
        year: date.getFullYear()
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 seconds timeout
    });

    if (!response.data || !response.data.data || !response.data.data[date.getDate() - 1]) {
      throw new Error('Invalid response from prayer times API');
    }

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
    
    // Cache the result for this day
    localStorage.setItem(cacheKey, JSON.stringify(processedTimings));

    return processedTimings;
  } catch (error) {
    console.error('Error fetching prayer times:', error);
    throw new Error('নামাযের সময় আনতে ব্যর্থ হয়েছে। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।');
  }
};
