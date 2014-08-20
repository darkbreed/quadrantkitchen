$(document).ready(function(){

	//Init Foundation
   	$(document).foundation();

   	/* * * CONFIGURATION VARIABLES: EDIT BEFORE PASTING INTO YOUR WEBPAGE * * */
    var disqus_shortname = 'quadrantkitchen'; // Required - Replace example with your forum shortname

    /* * * DON'T EDIT BELOW THIS LINE * * */
   
    var dsq = document.createElement('script'); 
    dsq.type = 'text/javascript'; 
    dsq.async = true;
    dsq.src = '//' + disqus_shortname + '.disqus.com/embed.js';
    $('#disqus_thread').append(dsq);

	//Set up intro animations
	$('#sidebar').addClass('page-loaded');
	$('#content').addClass('page-loaded');

	// then call it on load AND browser resize	
});