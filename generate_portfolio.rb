require 'erb'
require 'mini_magick'
require 'fileutils'

# Config
RAW_DIR = 'raw_images'
PROCESSED_DIR = 'images/processed'
OUTPUT_FILE = 'portfolio.html'
MAX_WIDTH = 1020
IMAGE_EXTS = /\.(png|jpe?g|webp|gif)$/i

# Helper: sanitize folder names for HTML IDs
def html_id(name)
  name.downcase.gsub(/[^a-z0-9]+/, '-')
end

# Collect categories and images
categories = {}

Dir.glob("#{RAW_DIR}/*").select { |f| File.directory?(f) }.each do |folder|
  category = File.basename(folder)
  image_files = Dir.entries(folder).select { |f| f =~ IMAGE_EXTS }

  next if image_files.empty?

  output_subdir = File.join(PROCESSED_DIR, category)
  FileUtils.mkdir_p(output_subdir)

  processed_images = []

  image_files.each do |filename|
    src = File.join(folder, filename)
    dst = File.join(output_subdir, filename)

    image = MiniMagick::Image.open(src)
    image.resize "#{MAX_WIDTH}x" if image.width > MAX_WIDTH
    image.strip
    image.quality "85"
    image.write(dst)

    processed_images << File.join(category, filename)
    puts "✔ Processed: #{category}/#{filename}"
  end

  categories[category] = processed_images
end

# HTML Template
template = <<-HTML
  <style>
    .gallery {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5remgenerate_portfolio;
    }
    .gallery img {
      width: 100%;
      cursor: pointer;
      border-radius: 4px;
      transition: transform 0.2s ease;
    }
    .gallery img:hover {
      transform: scale(1.02);
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 10;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.85);
      justify-content: center;
      align-items: center;
    }
    .modal img {
      max-width: #{MAX_WIDTH}px;
      max-height: 90vh;
      border-radius: 8px;
    }
    .modal.active {
      display: flex;
    }
  </style>
  <h1>My Portfolio</h1>

  <% categories.each do |category, images| %>
    <h2 id="<%= html_id(category) %>"><%= category.capitalize %></h2>
    <div class="gallery">
      <% images.each do |img| %>
        <img src="<%= File.join(PROCESSED_DIR, img) %>" alt="<%= File.basename(img) %>" onclick="showModal(this.src)">
      <% end %>
    </div>
  <% end %>

  <div class="modal" onclick="hideModal()" id="modal">
    <img src="" alt="preview" id="modal-img">
  </div>

  <script>
    function showModal(src) {
      document.getElementById("modal-img").src = src;
      document.getElementById("modal").classList.add("active");
    }
    function hideModal() {
      document.getElementById("modal").classList.remove("active");
    }
  </script>
HTML

# Render HTML
html = ERB.new(template).result(binding)
File.write(OUTPUT_FILE, html)
puts "✅ Portfolio page created: #{OUTPUT_FILE}"
