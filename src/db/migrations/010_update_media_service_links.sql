UPDATE client_media_services
   SET url = 'https://jellyfin.makeitso.studio/'
 WHERE service = 'jellyfin'
   AND url = 'http://jellyfin.makeitso.studio:8096/';

UPDATE client_media_services
   SET url = 'https://seer.makeitso.studio/'
 WHERE service = 'jellyseerr'
   AND url = 'http://jellyfin.makeitso.studio:5055/';
