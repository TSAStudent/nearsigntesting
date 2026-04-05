export async function GET(request: Request) {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const type = url.searchParams.get('type');

    if (!query || query.length < 3) {
        return Response.json([]);
    }

    try {
        const viewbox = '-97.78,33.48,-96.35,32.05';
        const searchTerm = type === 'school' ? `${query} high school` : query;
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&viewbox=${viewbox}&bounded=1&limit=5`;

        const response = await fetch(nominatimUrl, {
            headers: {
                'User-Agent': 'NearSignApp (contact: nearsign.app)',
            },
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        console.error('Error searching address:', error);
        return Response.json({ error: 'Failed to search addresses' }, { status: 500 });
    }
}
