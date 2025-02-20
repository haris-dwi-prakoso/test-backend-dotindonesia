import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { firstValueFrom } from 'rxjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly httpService: HttpService,
    @InjectRepository(User)
    private userRepository: Repository<User>
  ) { }
  async create(createUserDto: CreateUserDto) {
    // Create and save user entity
    let newUser = await this.userRepository.create(createUserDto);
    let saveUser = await this.userRepository.save(newUser);
    // Save user entity to cache
    await this.cacheManager.set(`user/${saveUser.id}`, saveUser, 6000);
    // Update list of users in cache
    let allUsers = await this.userRepository.find();
    await this.cacheManager.set('user/all', allUsers, 6000);
    return saveUser;
  }

  async findAll() {
    // Check if list of users exists in cache
    const cacheValue = await this.cacheManager.get('user/all');
    if (cacheValue) return cacheValue;
    else {
      // Check if database is empty
      let allUsers = await this.userRepository.find();
      if (!allUsers || allUsers.length == 0) {
        // Get list of users from JSONPlaceholder and populate cache & database with the list
        let response = await firstValueFrom(
          this.httpService.get(`https://jsonplaceholder.typicode.com/users`)
        );
        await this.cacheManager.set('user/all', response.data, 6000);
        let createUsers = await this.userRepository.create(response.data);
        await this.userRepository.insert(createUsers);
        return response.data;
      } else {
        // Save list of users to cache
        await this.cacheManager.set('user/all', allUsers, 6000);
        return allUsers;
      }
    }
  }

  async findOne(id: number) {
    // Check if user data exists in cache
    const cacheValue = await this.cacheManager.get(`user/${id}`);
    if (cacheValue) return cacheValue;
    else {
      // Get user data from database
      let getUser = await this.userRepository.findOneBy({ id: id });
      if (getUser) {
        // Save user data to cache if user exists in database
        await this.cacheManager.set(`user/${id}`, getUser, 6000);
      } else if (id > 0 && id <= 10) {
        // Get user data from JSONPlaceholder and save to cache and database if id is within the range of 1 to 10
        let response = await firstValueFrom(
          this.httpService.get(`https://jsonplaceholder.typicode.com/users/${id}`)
        );
        let createUser = await this.userRepository.create(response.data);
        let savedUser = await this.userRepository.save(createUser);
        await this.cacheManager.set(`user/${id}`, savedUser, 6000);
        return savedUser;
      }
      return getUser;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    // Append id to update data
    let updateData = { id: id, ...updateUserDto };
    let saveUser = await this.userRepository.save(updateData);
    // Save user data to cache
    await this.cacheManager.set(`user/${saveUser.id}`, saveUser, 6000);
    return saveUser;
  }

  async remove(id: number) {
    // Wipe user data from cache
    await this.cacheManager.del(`user/${id}`);
    return await this.userRepository.delete(id);
  }
}
