import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async findUserByEmail(email: string): Promise<User | null> {
    try {
      this.logger.log({ email }, 'Finding user by email');
      return this.userRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error(error, 'Error finding user by email');
      throw error;
    }
  }

  async createNewUser(signupDto: SignupDto) {
    try {
      this.logger.log({ signupDto }, 'Creating new user');
      const user = this.userRepository.create(signupDto);
      await user.hashPassword(signupDto.password);
      return this.userRepository.save(user);
    } catch (error) {
      this.logger.error(error, 'Error creating new user');
      throw error;
    }
  }

  async findUserById(id: number): Promise<User | null> {
    try {
      this.logger.log({ id }, 'Finding user by id');
      return this.userRepository.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(error, 'Error finding user by id');
      throw error;
    }
  }

  async findAllUsers(): Promise<User[]> {
    try {
      this.logger.log('Fetching all users for dev login');
      return this.userRepository.find();
    } catch (error) {
      this.logger.error(error, 'Error fetching all users');
      throw error;
    }
  }
}
