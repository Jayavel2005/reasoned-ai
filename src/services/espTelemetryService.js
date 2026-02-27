export const fetchEspTelemetry = async () => {
    const fetchWithTimeout = async (url, options, timeout = 500) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (e) {
            clearTimeout(id);
            throw e;
        }
    };

    try {
        const [inletData, leakData, outletData] = await Promise.all([
            fetchWithTimeout('http://pressure-node1.local/data'),
            fetchWithTimeout('http://airleak.local/data'),
            fetchWithTimeout('http://pressure-node3.local/data')
        ]);

        const inletPressurePsi = (inletData.pressure_bar || 0) * 14.5038;
        const outletPressurePsi = (outletData.pressure_bar || 0) * 14.5038;
        const systemPressurePsi = (inletPressurePsi + outletPressurePsi) / 2;

        return {
            inletPressurePsi,
            outletPressurePsi,
            inletVoltage: inletData.voltage || 0,
            outletVoltage: outletData.voltage || 0,
            leakVoltage: leakData.voltage || 0,
            leakDetected: !!leakData.leak,
            systemPressurePsi,
            connected: true,
            lastUpdate: Date.now()
        };
    } catch (error) {
        console.error("ESP32 Telemetry Fetch Error:", error);
        return null;
    }
};
