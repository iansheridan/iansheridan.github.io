require 'erb'
require 'mini_magick'
require 'fileutils'

# Config
RAW_DIR = 'raw_images'
PROCESSED_DIR = 'images/processed'
OUTPUT_FILE = '_includes/portfolio_items.html'
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
  <% categories.each do |category, images| %>
    <h2 id="<%= html_id(category) %>"><%= category.capitalize %></h2>
    <div class="gallery">
      <% images.each do |img| %>
        <img src="<%= File.join(PROCESSED_DIR, img) %>" alt="<%= File.basename(img) %>" onclick="showModal(this.src)">
      <% end %>
    </div>
  <% end %>
HTML

# Render HTML
html = ERB.new(template).result(binding)
File.write(OUTPUT_FILE, html)
puts "✅ Portfolio page created: #{OUTPUT_FILE}"
