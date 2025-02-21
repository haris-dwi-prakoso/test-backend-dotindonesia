import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpService } from '@nestjs/axios';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Todo } from './entities/todo.entity';
import { firstValueFrom } from 'rxjs';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodoService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    private readonly httpService: HttpService,
    @InjectRepository(Todo)
    private todoRepository: Repository<Todo>
  ) { }
  async create(createTodoDto: CreateTodoDto) {
    // Create and save todo entity
    let newTodo = await this.todoRepository.create(createTodoDto);
    let saveTodo = await this.todoRepository.save(newTodo);
    // Save todo entity to cache
    await this.cacheManager.set(`todo/${saveTodo.id}`, saveTodo, 6000);
    // Update list of todos in cache
    let allTodos = await this.todoRepository.find();
    await this.cacheManager.set('todo/all', allTodos, 6000);
    return saveTodo;
  }

  async findAll() {
    // Check if list of todos exists in cache
    const cacheValue = await this.cacheManager.get('todo/all');
    if (cacheValue) return cacheValue;
    else {
      // Check if database is empty
      let allTodos = await this.todoRepository.find();
      if (!allTodos || allTodos.length == 0) {
        // Get list of todos from JSONPlaceholder and populate cache & database with the list
        let response = await firstValueFrom(
          this.httpService.get(`https://jsonplaceholder.typicode.com/todos`)
        );
        await this.cacheManager.set('todo/all', response.data, 6000);
        for (let i = 0; i < response.data.length; i++) {
          await this.cacheManager.set(`todo/${response.data[i].id}`, response.data[i], 6000);
        }
        let createTodos = await this.todoRepository.create(response.data);
        await this.todoRepository.insert(createTodos);
        return response.data;
      } else {
        // Save list of todos to cache
        await this.cacheManager.set('todo/all', allTodos, 6000);
        return allTodos;
      }
    }
  }

  async findOne(id: number) {
    // Check if user data exists in cache
    const cacheValue = await this.cacheManager.get(`todo/${id}`);
    if (cacheValue) return cacheValue;
    else {
      // Get todo data from database
      let getTodo = await this.todoRepository.findOneBy({ id: id });
      if (getTodo) {
        // Save todo data to cache if todo exists in database
        await this.cacheManager.set(`todo/${id}`, getTodo, 6000);
      }
      // else if (id > 0 && id <= 200) {
      //   // Get todo data from JSONPlaceholder and save to cache and database if id is within the range of 1 to 200
      //   let response = await firstValueFrom(
      //     this.httpService.get(`https://jsonplaceholder.typicode.com/todos/${id}`)
      //   );
      //   let createTodo = await this.todoRepository.create(response.data);
      //   let savedTodo = await this.todoRepository.save(createTodo);
      //   await this.cacheManager.set(`todo/${id}`, savedTodo, 6000);
      //   return savedTodo;
      // }
      return getTodo;
    }
  }

  async update(id: number, updateTodoDto: UpdateTodoDto) {
    // Append id to update data
    let updateData = { id: id, ...updateTodoDto };
    let saveTodo = await this.todoRepository.save(updateData);
    // Save todo data to cache
    await this.cacheManager.set(`todo/${saveTodo.id}`, saveTodo, 6000);
    // Update list of todos in cache
    let allTodos = await this.todoRepository.find();
    await this.cacheManager.set('todo/all', allTodos, 6000);
    return saveTodo;
  }

  async remove(id: number) {
    // Wipe todo data from cache and database
    await this.cacheManager.del(`todo/${id}`);
    let deleteResult = await this.todoRepository.delete(id);
    // Update list of todos in cache
    let allTodos = await this.todoRepository.find();
    await this.cacheManager.set('todo/all', allTodos, 6000);
    return deleteResult;
  }
}
