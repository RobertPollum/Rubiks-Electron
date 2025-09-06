# Rubiks-Electron
Playing around with building an electron application to play with a Rubik's cube digitally.

This is my attempt at learning electron since it gives the ability to build desktop applications using front end web frameworks that I'm already familiar with. 

# Goals
[X] Get the basic electron application running
[ ] Figure out including node modules within the application
[ ] Get a Three JS render running within the application
[ ] Transform basic render into a 9x9 set of cubes
[ ] Create a predefined matrix to then generate the 9x9 cube
    - This will help me define the data store for the 
[ ] Create scambling logic for the cube so that it can actually be solved
    - IE Sides need to pair up correctly so that once __solved__ for a side, the edges on each side will match up.
[ ] Create interaction with cube to change rows
    - Functions will need to be defined for how the 9x9x9 matrix will transform based on the move
    - Create a visual transformation within the cube
[ ] Potential play by play walkthrough of solving a cube