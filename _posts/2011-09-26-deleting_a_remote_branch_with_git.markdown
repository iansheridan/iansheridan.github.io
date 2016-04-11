---
layout: post
title:  "Deleting a remote branch with GIT"
date:   2011-09-26 12:50:38 -0000
categories: update
---

I was hunting around for how to do this. **Why!?** Well, because I forget the simple at times. I knew that the knowledge was between my ears but retrieving it was thwarting me. So Googling is what I do to jiggle the brain cells. Well the answer is simple and totally non-intuitive.

	git push origin :branchtodelete

What?! Well look carfully there is a colon in there **":"**. "What the hell?" I hear you saying. Yes it is darn kludgy but it works.

**Now a word of warning.** In general you do _not_ want to delete a branch that you have made public even if it is only for a select group of developers. you never know how it is being used by others.
