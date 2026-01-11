const API_KEY = "68fd6f5862322635ad1bc016757a39a8"; // Buraya kendi anahtarınızı ekleyin

export async function fetchWeather(lat: number, lon: number) {
  try {
    // Mevcut hava durumu
    const current = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=tr&appid=${API_KEY}`
    );
    // 5 günlük / 3 saatlik tahmin
    const forecast = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=tr&appid=${API_KEY}`
    );

    return {
      current: await current.json(),
      hourly: await forecast.json(),
    };
  } catch (error) {
    console.error("Hava durumu hatası:", error);
    return null;
  }
}
