// Offline orthographic rasterization for the authored tree atlas.
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <fstream>
#include <limits>
#include <vector>

struct Vertex {
    float x, y, depth, red, green, blue;
};

static float edge(float x, float y, const Vertex& a, const Vertex& b) {
    return (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
}

static std::uint8_t encode(float linear) {
    linear = std::clamp(linear, 0.f, 1.f);
    const float srgb = linear <= .0031308f
        ? 12.92f * linear
        : 1.055f * std::pow(linear, 1.f / 2.4f) - .055f;
    return std::uint8_t(std::round(srgb * 255.f));
}

int main(int argc, char** argv) {
    if (argc != 3) return 1;
    std::ifstream input(argv[1], std::ios::binary);
    std::uint32_t size, vertexCount, indexCount;
    input.read(reinterpret_cast<char*>(&size), sizeof(size));
    input.read(reinterpret_cast<char*>(&vertexCount), sizeof(vertexCount));
    input.read(reinterpret_cast<char*>(&indexCount), sizeof(indexCount));
    std::vector<Vertex> vertices(vertexCount);
    std::vector<std::uint32_t> indices(indexCount);
    input.read(reinterpret_cast<char*>(vertices.data()), vertices.size() * sizeof(Vertex));
    input.read(reinterpret_cast<char*>(indices.data()), indices.size() * sizeof(std::uint32_t));
    if (!input || !size || indexCount % 3) return 2;
    std::vector<std::uint8_t> pixels(size * size * 4);
    std::vector<float> depth(size * size, -std::numeric_limits<float>::infinity());
    const int limit = int(size) - 1;

    for (std::size_t i = 0; i < indices.size(); i += 3) {
        const Vertex& a = vertices.at(indices[i]);
        const Vertex& b = vertices.at(indices[i + 1]);
        const Vertex& c = vertices.at(indices[i + 2]);
        const float area = edge(c.x, c.y, a, b);
        if (std::abs(area) < .0000001f) continue;
        const int x0 = std::max(0, int(std::floor(std::min({a.x, b.x, c.x}))));
        const int x1 = std::min(limit, int(std::ceil(std::max({a.x, b.x, c.x}))));
        const int y0 = std::max(0, int(std::floor(std::min({a.y, b.y, c.y}))));
        const int y1 = std::min(limit, int(std::ceil(std::max({a.y, b.y, c.y}))));
        for (int y = y0; y <= y1; y++) {
            for (int x = x0; x <= x1; x++) {
                const float wc = edge(x + .5f, y + .5f, a, b) / area;
                const float wa = edge(x + .5f, y + .5f, b, c) / area;
                const float wb = 1.f - wa - wc;
                if (wa < 0.f || wb < 0.f || wc < 0.f) continue;
                const float value = a.depth * wa + b.depth * wb + c.depth * wc;
                const auto offset = std::size_t(y) * size + x;
                if (value <= depth[offset]) continue;
                depth[offset] = value;
                auto* pixel = pixels.data() + offset * 4;
                pixel[0] = encode(a.red * wa + b.red * wb + c.red * wc);
                pixel[1] = encode(a.green * wa + b.green * wb + c.green * wc);
                pixel[2] = encode(a.blue * wa + b.blue * wb + c.blue * wc);
                pixel[3] = 255;
            }
        }
    }
    std::ofstream output(argv[2], std::ios::binary);
    output.write(reinterpret_cast<const char*>(pixels.data()), pixels.size());
    return output ? 0 : 3;
}
