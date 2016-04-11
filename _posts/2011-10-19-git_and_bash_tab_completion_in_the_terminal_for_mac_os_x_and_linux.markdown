---
layout: post
title:  "git and bash tab completion in the terminal for mac os x (and linux)"
date:   2011-10-19 08:08:29 -0000
categories: update
---

I use the terminal all the time while I code and I like things to go fast when i do. Tab completion is a habit once you have it will stay with you forever. When on a system that does not do it, you go crazy. Like I did. On top of normal completion I use GIT a lot. So I want git to auto-complete remote name and especially branch names which I have a ton of. So here is a guide to get total completion going.

I just do it for the current user you can do this for system wide too and I will note the tweaks you can mak to this guide at the bottom.

Download and clone bash_completion and the source for git as follows:

	cd; mkdir src; cd src
	wget http://bash-completion.alioth.debian.org/files/bash-completion-1.3.tar.bz2
	git clone git://git.kernel.org/pub/scm/git/git.git

untar the bas-completion file

	tar xvf bash-completion-1.3.tar.bz2

copy the files to your home directory (I hide them with the ".")

	cp bash-completion-1.3/bash_completion ~/.bash_completion
	cp git/contrib/completion/git-completion.bash ~/.git-completion.bash

in your `.bashrc` or `.profile` file add the following two lines:

	. ~/.bash_completion
	. ~/.git-completion.bash

That should do it! So load up a new terminal and try it out!

These are the articles that I used to get this together.

[http://meinit.nl/bash-completion-mac-os-x](http://meinit.nl/bash-completion-mac-os-x "")  
[http://denis.tumblr.com/post/71390665/adding-bash-completion-for-git-on-mac-os-x-snow-leopard](http://denis.tumblr.com/post/71390665/adding-bash-completion-for-git-on-mac-os-x-snow-leopard "")

<iframe width="420" height="315" src="http://www.youtube.com/embed/3WsWAeiV1KM" frameborder="0" allowfullscreen></iframe>
