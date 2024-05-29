import requests
import pandas as pd
import numpy as np
from plyfile import PlyData, PlyElement
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

# URLs for the data files
urlArr = [
    'https://pds-geosciences.wustl.edu/lunar/clem1-l-lidar-3-topo-v1/cl_9xxx/data/r008_099.tab',
    'https://pds-geosciences.wustl.edu/lunar/clem1-l-lidar-3-topo-v1/cl_9xxx/data/r100_199.tab',
    'https://pds-geosciences.wustl.edu/lunar/clem1-l-lidar-3-topo-v1/cl_9xxx/data/r200_299.tab',
    'https://pds-geosciences.wustl.edu/lunar/clem1-l-lidar-3-topo-v1/cl_9xxx/data/r300_346.tab'
]
nameArr = ['r008_099', 'r100_199', 'r200_299', 'r300_346']

# Function to get color based on elevation
def get_color(elevation, cmap, norm):
    rgba_color = cmap(norm(elevation))
    rgb_color = (int(rgba_color[0] * 255), int(rgba_color[1] * 255), int(rgba_color[2] * 255))
    return rgb_color

# Step 1: Fetch the data
for i, url in enumerate(urlArr):
    response = requests.get(url)

    # Save the data to a temporary file
    temp_file = nameArr[i] + '.tab'
    with open(temp_file, 'w') as file:
        file.write(response.text)

    # Step 2: Process the data with regex delimiter for multiple spaces
    data = pd.read_csv(temp_file, delimiter=r'\s+', header=None, low_memory=False)

    # Map all columns based on the given dataset description
    columns = {
        0: 'universal_time',
        1: 'camera_frame',
        2: 'revolution_number',
        3: 'latitude',
        4: 'longitude',
        5: 'sc_radial_distance',
        6: 'lunar_spheroid_radius',
        7: 'sc_position_x',
        8: 'sc_position_y',
        9: 'sc_position_z',
        10: 'right_ascension',
        11: 'declination',
        12: 'twist',
        13: 'predicted_range',
        14: 'predicted_slant_range',
        15: 'first_range_before_window',
        16: 'first_range_inside_window',
        17: 'second_range_inside_window',
        18: 'third_range_inside_window',
        19: 'last_range_inside_window',
        20: 'first_range_after_window',
        21: 'first_radius_before_window',
        22: 'first_radius_inside_window',
        23: 'second_radius_inside_window',
        24: 'third_radius_inside_window',
        25: 'last_radius_inside_window',
        26: 'first_radius_after_window',
        27: 'first_elevation_before_window',
        28: 'first_elevation_inside_window',
        29: 'second_elevation_inside_window',
        30: 'third_elevation_inside_window',
        31: 'last_elevation_inside_window',
        32: 'first_elevation_after_window',
        33: 'range_gate_window_opening',
        34: 'range_gate_window_closing',
        35: 'range_threshold_a',
        36: 'range_threshold_b'
    }

    # Assign column names
    data.columns = [columns.get(i, f'col_{i}') for i in range(data.shape[1])]

    # Convert latitude and longitude from degrees to radians for calculation
    data['latitude'] = pd.to_numeric(data['latitude'], errors='coerce').dropna().astype(float)
    data['longitude'] = pd.to_numeric(data['longitude'], errors='coerce').dropna().astype(float)
    data['latitude'] = np.deg2rad(data['latitude'])
    data['longitude'] = np.deg2rad(data['longitude'])

    # Calculate Cartesian coordinates for laser bounce points
    data['first_elevation_inside_window'] = pd.to_numeric(data['first_elevation_inside_window'], errors='coerce').fillna(0).astype(float)
    data['lunar_spheroid_radius'] = pd.to_numeric(data['lunar_spheroid_radius'], errors='coerce').fillna(0).astype(float)
    ranges = data['first_elevation_inside_window']
    radii = data['lunar_spheroid_radius'] + ranges
    x_coords = radii * np.cos(data['latitude']) * np.cos(data['longitude'])
    y_coords = radii * np.cos(data['latitude']) * np.sin(data['longitude'])
    z_coords = radii * np.sin(data['latitude'])

    # Prepare color map
    elevations = data['first_elevation_inside_window']
    cmap = plt.get_cmap('viridis')
    norm = mcolors.Normalize(vmin=elevations.min(), vmax=elevations.max())
    colors = np.array([get_color(elevation, cmap, norm) for elevation in elevations], dtype=[('red', 'u1'), ('green', 'u1'), ('blue', 'u1')])

    # Step 3: Convert to PLY
    vertices = np.array([tuple(row) for row in np.vstack((x_coords, y_coords, z_coords)).transpose()], dtype=[('x', 'f4'), ('y', 'f4'), ('z', 'f4')])
    vertex_element = PlyElement.describe(vertices, 'vertex')
    color_element = PlyElement.describe(colors, 'color')

    # Write to PLY file
    ply_file = f'lidar_data_{nameArr[i]}.ply'
    PlyData([vertex_element, color_element]).write(ply_file)

    print(f'Data has been written to {ply_file}')
