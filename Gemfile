source 'https://rubygems.org'

require 'json'
require 'open-uri'
versions = JSON.parse(URI.open("https://pages.github.com/versions.json").read)

gem 'jekyll'
gem 'github-pages', versions['github-pages']
gem 'jekyll-paginate'
gem 'pygments.rb'
gem 'webrick'
