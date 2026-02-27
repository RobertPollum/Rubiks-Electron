# Rubiks-Electron
Playing around with building an electron application to play with a Rubik's cube digitally.

This is my attempt at learning electron since it gives the ability to build desktop applications using front end web frameworks/language that I'm already familiar with. 

# Goals
- [x] Get the basic electron application running
- [ ] Figure out including node modules within the application
    - [ ] Ideally use file storage for electron app 
- [x] Get a Three JS render running within the application
- [x] Transform basic render into a 3x3x3 set of cubes
- [x] Create a predefined matrix to then generate the 3x3x3 cube
    - This will help me define the data store for the cube and state
- [x] Create scambling logic for the cube so that it can actually be solved
    - IE Sides need to pair up correctly so that once __solved__ for a side, the edges on each side will match up.
    - [ ] Make the amount the cube scrambles user defined (IE, between 1 and infinity)
    - [ ] Save the scramble amount to user settings
- [x] Create interaction with cube to change rows
    - Functions will need to be defined for how the 9x9x9 matrix will transform based on the move
    - Create a visual transformation within the cube
- [ ] Potential play by play walkthrough of solving a cube
- [ ] Move tracking for a round of solving the cube
- [ ] Migrate node/interaction code so that it can run as a web application
    - [ ] Create interfaces that allow for swapping between local storage of electron and api interfaces for web storage for a user.
    - [ ] Add individual user log in that allows different people to access their cube data on the web
    - [ ] Data backup for an account if it's an electron application? IE story in Google Drive, Dropbox, Onedrive, Mega, etc...
- [ ] Storage for session to allow user to return and pick up where they left off when the application opens/closes
- [ ] Allow user to modify the cube
    - [ ] Allow them to modify number of cubes 2x2, 3x3, 4x4, etc. This may require an interace redesin.
    - [ ] Allow user to modify the colors used for the faces in realtime.
    - [ ] Create some predefined color sets, things for color blindness, high contrast, grayscale, standard, pastel
